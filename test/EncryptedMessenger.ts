import { expect } from "chai";
import { ethers, fhevm, network } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

describe("EncryptedMessenger", function () {
  it("stores and returns messages and encrypted address", async function () {
    await fhevm.initializeCLIApi();
    const [sender, recipient] = await ethers.getSigners();

    const factory = await ethers.getContractFactory("EncryptedMessenger");
    const contract = await factory.deploy();

    // Encrypt the sender address using Zama relayer
    const enc = await fhevm
      .createEncryptedInput(contract.target as string, sender.address)
      .addAddress(sender.address)
      .encrypt();

    const content = "hello-encrypted";
    const tx = await contract
      .connect(sender)
      .sendMessage(recipient.address, content, enc.handles[0], enc.inputProof);
    await tx.wait();

    const count = await contract.getMessageCount(recipient.address);
    expect(count).to.equal(1n);

    const [from, ts, stored, eaddr] = await contract.getMessageAt(recipient.address, 0);
    expect(from).to.equal(sender.address);
    expect(stored).to.equal(content);
    expect(ts).to.be.gt(0);

    if (network.name === 'sepolia') {
      const decrypted = await fhevm.userDecryptEaddress(
        FhevmType.eaddress,
        eaddr,
        contract.target as string,
        sender,
      );
      expect(decrypted.toLowerCase()).to.equal(sender.address.toLowerCase());
    }
  });
});
