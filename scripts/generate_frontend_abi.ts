import fs from 'fs';
import path from 'path';

function generate() {
  const roots = [
    path.join(process.cwd(), 'deployments', 'sepolia'),
    path.join(process.cwd(), 'deployments', 'localhost'),
  ];
  let foundDir: string | null = null;
  for (const dir of roots) {
    if (fs.existsSync(path.join(dir, 'EncryptedMessenger.json'))) {
      foundDir = dir;
      break;
    }
  }
  if (!foundDir) {
    throw new Error('EncryptedMessenger deployment artifact not found in deployments/sepolia or deployments/localhost');
  }
  const artifact = JSON.parse(fs.readFileSync(path.join(foundDir, 'EncryptedMessenger.json'), 'utf8'));
  const addressPath = path.join(foundDir, 'EncryptedMessenger.address');
  const address = fs.existsSync(addressPath)
    ? fs.readFileSync(addressPath, 'utf8').trim()
    : artifact.address || artifact.networks?.[0]?.address || '';
  if (!address) {
    throw new Error('Could not determine EncryptedMessenger address');
  }
  const abi = artifact.abi;
  const dest = path.join(process.cwd(), 'home', 'src', 'config', 'messenger.ts');
  const content = `// Auto-generated from deployments. Do not edit manually.\nexport const CONTRACT_ADDRESS = '${address}' as const;\nexport const CONTRACT_ABI = ${JSON.stringify(abi, null, 2)} as const;\n`;
  fs.writeFileSync(dest, content);
  console.log('Wrote', dest);
}

generate();

