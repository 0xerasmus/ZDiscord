import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("msg:address", "Prints the EncryptedMessenger address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const deployed = await deployments.get("EncryptedMessenger");
  console.log("EncryptedMessenger address is " + deployed.address);
});

task("msg:send", "Send a message")
  .addParam("to", "Recipient address")
  .addParam("text", "Plaintext to encrypt with recipient address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const deployed = await deployments.get("EncryptedMessenger");
    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("EncryptedMessenger", deployed.address);

    // Zama encrypt the sender address to include with the message
    const enc = await fhevm
      .createEncryptedInput(deployed.address, signer.address)
      .addAddress(signer.address)
      .encrypt();

    // For contract storage, we send the ciphertext as a string; here we just prefix with addr-keccak for demo
    // In real frontend, use WebCrypto AES-GCM with recipient address derived key
    const encryptedContent = `enc:${taskArguments.text}`;

    const tx = await contract
      .connect(signer)
      .sendMessage(taskArguments.to, encryptedContent, enc.handles[0], enc.inputProof);
    console.log(`Wait for tx: ${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx status: ${receipt?.status}`);
  });

task("msg:list", "List messages for an address")
  .addOptionalParam("user", "User address to query; defaults to first signer")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const deployed = await deployments.get("EncryptedMessenger");
    const [signer] = await ethers.getSigners();
    const user = taskArguments.user || signer.address;
    const contract = await ethers.getContractAt("EncryptedMessenger", deployed.address);
    const count = await contract.getMessageCount(user);
    console.log(`Messages for ${user}: ${count}`);
    for (let i = 0; i < Number(count); i++) {
      const [from, ts, content, encAddr] = await contract.getMessageAt(user, i);
      console.log(`#${i} from=${from} ts=${ts} content=${content} encAddr=${encAddr}`);
    }
  });

task("msg:decrypt-addr", "Decrypt the encrypted address of a message")
  .addParam("index", "Message index")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();
    const deployed = await deployments.get("EncryptedMessenger");
    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("EncryptedMessenger", deployed.address);
    const [, , , encAddr] = await contract.getMessageAt(signer.address, Number(taskArguments.index));
    const clear = await fhevm.userDecryptEaddress(
      FhevmType.eaddress,
      encAddr,
      deployed.address,
      signer,
    );
    console.log(`Decrypted address: ${clear}`);
  });

