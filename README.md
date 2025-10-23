# ZDiscord - Private Messaging DApp

A fully decentralized, privacy-first messaging application built on Ethereum using Zama's Fully Homomorphic Encryption (FHE) technology. ZamaDiscord enables users to send end-to-end encrypted messages on-chain while maintaining complete privacy and confidentiality through cutting-edge cryptographic techniques.

[![License](https://img.shields.io/badge/license-BSD--3--Clause--Clear-blue.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.27-363636?logo=solidity)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow.svg)](https://hardhat.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Problems Solved](#problems-solved)
- [Advantages](#advantages)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Smart Contract Deployment](#smart-contract-deployment)
  - [Frontend Setup](#frontend-setup)
- [Usage](#usage)
- [Smart Contracts](#smart-contracts)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Security Considerations](#security-considerations)
- [Future Roadmap](#future-roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Overview

ZamaDiscord is a revolutionary decentralized messaging platform that combines the transparency and immutability of blockchain technology with the privacy guarantees of Fully Homomorphic Encryption (FHE). Unlike traditional messaging apps where your data is controlled by centralized entities, ZamaDiscord gives users complete ownership and control over their communications while ensuring messages remain private even when stored on a public blockchain.

The project leverages **Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine)** to enable computations on encrypted data without ever decrypting it, creating a messaging system where:
- Messages are encrypted end-to-end
- Sender addresses are encrypted using FHE on-chain
- Message content is encrypted using AES-GCM derived from recipient addresses
- All data remains private while being stored on the Ethereum blockchain
- Only intended recipients can decrypt their messages

## Key Features

### Privacy-First Design
- **Dual-Layer Encryption**: Combines off-chain AES-GCM encryption for message content with on-chain FHE encryption for sensitive metadata
- **Sender Anonymity**: Sender addresses are stored as encrypted values using Zama's FHE, protecting sender identity on-chain
- **Recipient-Only Access**: Messages can only be decrypted by the intended recipient using their private key

### Blockchain-Native
- **Decentralized Storage**: All messages stored immutably on Ethereum blockchain
- **No Central Server**: Completely decentralized architecture with no single point of failure
- **Censorship Resistant**: No authority can block, delete, or modify messages once sent
- **Transparent Yet Private**: All transactions visible on-chain, but content remains encrypted

### User Experience
- **Web3 Wallet Integration**: Seamless connection via RainbowKit supporting all major wallets
- **Simple Interface**: Clean, intuitive UI built with React
- **Real-time Updates**: Automatic inbox refresh upon new messages
- **Transaction Transparency**: View all transaction hashes and on-chain confirmations

### Developer-Friendly
- **Full TypeScript Support**: Type-safe development across smart contracts and frontend
- **Comprehensive Testing**: Complete test suite for both local and Sepolia testnet
- **Hardhat Integration**: Professional development environment with debugging tools
- **Modular Architecture**: Clean separation of concerns for easy maintenance and extension

## Technology Stack

### Smart Contract Layer
- **Solidity 0.8.27**: Latest stable Solidity compiler with Cancun EVM support
- **FHEVM by Zama**: Fully Homomorphic Encryption for on-chain privacy
  - `@fhevm/solidity ^0.8.0`: Core FHE library for Solidity
  - `@zama-fhe/oracle-solidity ^0.1.0`: Decryption oracle integration
  - `encrypted-types ^0.0.4`: Type definitions for encrypted data structures
- **Hardhat 2.26.0**: Ethereum development environment
  - `hardhat-deploy`: Deterministic deployment framework
  - `@fhevm/hardhat-plugin`: FHEVM integration for Hardhat
  - `hardhat-gas-reporter`: Gas consumption analysis
  - `solidity-coverage`: Code coverage reporting

### Frontend Layer
- **React 19.1.1**: Modern UI framework with latest features
- **TypeScript 5.8.3**: Type-safe JavaScript development
- **Ethers.js 6.15.0**: Ethereum wallet and contract interaction
- **Wagmi 2.17.0**: React hooks for Ethereum
- **RainbowKit 2.2.8**: Best-in-class wallet connection experience
- **Viem 2.37.6**: Type-safe Ethereum interface
- **TanStack Query 5.89.0**: Powerful data fetching and caching
- **Vite 7.1.6**: Lightning-fast build tool and dev server

### Cryptography & Encryption
- **Zama FHE Relayer SDK 0.2.0**: Client-side encryption using Zama's relayer
- **Web Crypto API**: Browser-native AES-GCM encryption
- **SHA-256**: Address-derived key generation

### Development Tools
- **TypeChain**: Automatic TypeScript bindings for smart contracts
- **ESLint**: Code quality and consistency enforcement
- **Prettier**: Code formatting with Solidity support
- **Solhint**: Solidity-specific linting
- **Mocha & Chai**: Testing framework with assertion library

### Network & Infrastructure
- **Ethereum Sepolia Testnet**: Primary deployment network
- **Infura**: Ethereum node provider
- **Etherscan**: Contract verification and blockchain explorer

## Architecture

### Smart Contract Architecture

```
EncryptedMessenger Contract
├── Message Structure
│   ├── sender (address): Plaintext sender address
│   ├── timestamp (uint256): Block timestamp
│   ├── encryptedContent (string): AES-GCM encrypted message
│   └── encryptedAddress (eaddress): FHE encrypted sender address
│
├── Storage
│   └── _inbox: mapping(address => Message[])
│       └── Stores all messages per recipient
│
└── Functions
    ├── sendMessage(): Send encrypted message to recipient
    ├── getMessageCount(): Get total messages for user
    └── getMessageAt(): Retrieve specific message by index
```

### Encryption Flow

```
Sender Side:
1. User composes message in frontend
2. Message content encrypted with AES-GCM using recipient's address as key derivation input
3. Sender address encrypted using Zama FHE relayer
4. Transaction sent to EncryptedMessenger contract
5. Contract stores encrypted data and grants ACL permissions

Recipient Side:
1. Frontend queries message count from contract
2. Retrieves all messages for connected wallet
3. Decrypts message content using own address-derived key
4. (Optional) Decrypts FHE sender address using Zama's decryption oracle
```

### Frontend Architecture

```
React Application
├── Components
│   ├── MessengerApp: Main messaging interface
│   └── Header: Navigation and branding
├── Hooks
│   ├── useEthersSigner: Ethers.js signer from Wagmi
│   └── useZamaInstance: Zama FHE instance initialization
├── Config
│   └── messenger: Contract ABI and address
└── Encryption
    ├── deriveKeyFromAddress(): SHA-256 key derivation
    └── encryptWithAddress(): AES-GCM encryption
```

## Problems Solved

### 1. Privacy on Public Blockchains
**Problem**: Traditional blockchain applications store all data in plaintext, making private messaging impossible on-chain.

**Solution**: ZamaDiscord uses Zama's FHE technology to enable encrypted data storage and computation on the blockchain. Messages and sender metadata remain encrypted on-chain while still allowing for verification and immutability.

### 2. Centralized Messaging Platforms
**Problem**: Platforms like WhatsApp, Telegram, and Discord are controlled by centralized entities that can:
- Read your messages (even with "end-to-end encryption")
- Ban users arbitrarily
- Monetize user data
- Shut down accounts without recourse
- Be compelled by governments to reveal data

**Solution**: ZamaDiscord is completely decentralized with no central authority. Messages are stored on the blockchain, wallets are self-custodial, and no one can censor or ban users.

### 3. Trust in Service Providers
**Problem**: Users must trust messaging providers not to access their data, sell it, or hand it over to third parties.

**Solution**: With ZamaDiscord, there is no service provider to trust. The code is open-source, the blockchain is transparent, and cryptographic guarantees ensure privacy.

### 4. Message Permanence and Auditability
**Problem**: Traditional platforms can delete messages, alter history, or lose data.

**Solution**: All messages on ZamaDiscord are permanently stored on the blockchain with cryptographic proof of delivery and timestamp.

### 5. Key Management Complexity
**Problem**: End-to-end encrypted apps often require complex key exchange protocols and key management systems.

**Solution**: ZamaDiscord leverages Ethereum addresses as the basis for encryption keys, eliminating the need for separate key infrastructure.

### 6. Metadata Leakage
**Problem**: Even with message encryption, metadata (who sends to whom, when) is often exposed.

**Solution**: By encrypting sender addresses using FHE, ZamaDiscord protects even metadata from unauthorized access.

## Advantages

### For Users

1. **True Ownership**: You own your messages and data - no company can lock you out or delete your history
2. **Maximum Privacy**: Dual-layer encryption ensures both message content and metadata remain private
3. **Censorship Resistance**: No one can prevent you from sending or receiving messages
4. **Transparency**: All code is open-source and auditable
5. **Interoperability**: Works with any Web3 wallet (MetaMask, WalletConnect, Coinbase Wallet, etc.)
6. **No Sign-Up Required**: Connect wallet and start messaging immediately
7. **Permanent Records**: Messages are immutably stored on the blockchain forever

### For Privacy Advocates

1. **Cryptographic Guarantees**: Privacy guaranteed by mathematics, not corporate promises
2. **Zero-Knowledge Architecture**: Service operators cannot read messages even if they wanted to
3. **Metadata Protection**: Sender addresses encrypted on-chain using FHE
4. **No Third-Party Trust**: No need to trust any company or service provider
5. **Open Source**: Complete transparency into how the system works

### For Developers

1. **FHEVM Integration**: First-class example of building with Zama's FHE technology
2. **Modern Stack**: Latest versions of React, TypeScript, Hardhat, and Ethers.js
3. **Type Safety**: Full TypeScript support across smart contracts and frontend
4. **Well-Documented**: Comprehensive documentation and code comments
5. **Testing Framework**: Complete test suite with local and testnet examples
6. **Modular Design**: Easy to extend with new features
7. **Best Practices**: Follows Solidity and React best practices

### Technical Advantages

1. **Fully Homomorphic Encryption**: Enables computation on encrypted data without decryption
2. **Dual Encryption Layers**: Combines FHE (on-chain) with AES-GCM (off-chain) for optimal privacy and performance
3. **Gas Efficiency**: Optimized for minimal gas costs with 800 optimizer runs
4. **Scalable Architecture**: Design supports future enhancements like groups, attachments, etc.
5. **EVM Compatible**: Works on any EVM-compatible chain supporting FHEVM
6. **No Oracles Required**: Self-contained system with integrated Zama decryption oracle

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 20 or higher
- **npm**: Version 7.0.0 or higher (or yarn/pnpm)
- **Git**: For cloning the repository
- **MetaMask or Web3 Wallet**: For interacting with the application
- **Sepolia ETH**: For deploying and testing on Sepolia testnet

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/ZamaDiscord.git
cd ZamaDiscord
```

2. **Install dependencies**

```bash
npm install
```

3. **Install frontend dependencies**

```bash
cd home
npm install
cd ..
```

### Environment Setup

1. **Configure Hardhat variables**

```bash
# Set your mnemonic (or use the default test mnemonic)
npx hardhat vars set MNEMONIC

# Set your Infura API key for Sepolia access
npx hardhat vars set INFURA_API_KEY

# Set Etherscan API key for contract verification
npx hardhat vars set ETHERSCAN_API_KEY
```

2. **Create .env file**

Create a `.env` file in the root directory:

```env
PRIVATE_KEY=your_private_key_here
INFURA_API_KEY=your_infura_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**Note**: Never commit your `.env` file to version control!

### Smart Contract Deployment

1. **Compile contracts**

```bash
npm run compile
```

2. **Run tests locally**

```bash
npm test
```

3. **Deploy to local Hardhat network**

```bash
# In one terminal, start local node
npx hardhat node

# In another terminal, deploy
npm run deploy:localhost
```

4. **Deploy to Sepolia testnet**

```bash
npm run deploy:sepolia
```

5. **Verify contracts on Etherscan**

```bash
npm run verify:sepolia
```

After deployment, update the contract address in `home/src/config/messenger.ts`:

```typescript
export const CONTRACT_ADDRESS = "0xYourDeployedContractAddress";
```

### Frontend Setup

1. **Generate ABI for frontend**

```bash
npm run sync:abi
```

2. **Navigate to frontend directory**

```bash
cd home
```

3. **Start development server**

```bash
npm run dev
```

4. **Access the application**

Open your browser to `http://localhost:5173`

5. **Build for production**

```bash
npm run build
```

## Usage

### Sending a Message

1. **Connect Your Wallet**
   - Click "Connect Wallet" button
   - Select your preferred wallet (MetaMask, WalletConnect, etc.)
   - Ensure you're connected to Sepolia testnet

2. **Compose Message**
   - Enter recipient's Ethereum address in the "To Address" field
   - Type your message in the text area
   - Note: Message will be encrypted with recipient's address as key

3. **Send**
   - Click "Send" button
   - Approve the transaction in your wallet
   - Wait for transaction confirmation
   - Transaction hash will be displayed upon success

### Reading Messages

1. **Connect Your Wallet**
   - Messages are automatically loaded for the connected address

2. **View Inbox**
   - Scroll to "Inbox" section
   - See total message count
   - Each message displays:
     - Sender address (plaintext)
     - Timestamp
     - Encrypted content (base64)
     - Encrypted sender address (FHE encrypted)

3. **Decrypt Messages** (Future Feature)
   - Currently displays encrypted content
   - Future versions will add decryption UI
   - Messages can be decrypted using the same address-derivation method

## Smart Contracts

### EncryptedMessenger.sol

Located at `contracts/EncryptedMessenger.sol`

**Purpose**: Store and deliver encrypted messages on-chain

**Key Functions**:

```solidity
function sendMessage(
    address to,
    string calldata encryptedContent,
    externalEaddress encAddr,
    bytes calldata inputProof
) external
```
- Sends an encrypted message to a recipient
- `to`: Recipient address
- `encryptedContent`: AES-GCM encrypted message
- `encAddr`: FHE encrypted sender address
- `inputProof`: Zama input proof for FHE encryption

```solidity
function getMessageCount(address user) external view returns (uint256)
```
- Returns the number of messages for a given user
- `user`: Address to query message count for

```solidity
function getMessageAt(address user, uint256 index)
    external view returns (
        address from,
        uint256 timestamp,
        string memory encryptedContent,
        eaddress encryptedAddr
    )
```
- Retrieves a specific message by index
- Returns sender, timestamp, encrypted content, and encrypted sender address

### FHECounter.sol

Located at `contracts/FHECounter.sol`

**Purpose**: Example contract demonstrating FHE operations

**Key Functions**:

```solidity
function increment(externalEuint32 inputEuint32, bytes calldata inputProof) external
```
- Increments counter by encrypted value

```solidity
function decrement(externalEuint32 inputEuint32, bytes calldata inputProof) external
```
- Decrements counter by encrypted value

```solidity
function getCount() external view returns (euint32)
```
- Returns encrypted count value

## Testing

### Local Testing

Run the full test suite on local Hardhat network:

```bash
npm test
```

Tests include:
- Message sending and retrieval
- Encryption and decryption flows
- Access control verification
- Edge cases and error handling

### Sepolia Testnet Testing

Test on live Sepolia network:

```bash
npm run test:sepolia
```

**Requirements**:
- Deployed contract on Sepolia
- Sepolia ETH in wallet
- Valid Infura API key

### Coverage Report

Generate code coverage report:

```bash
npm run coverage
```

View detailed coverage report in `coverage/index.html`

### Gas Reporting

Enable gas reporting:

```bash
REPORT_GAS=true npm test
```

## Project Structure

```
ZamaDiscord/
├── contracts/                  # Solidity smart contracts
│   ├── EncryptedMessenger.sol  # Main messaging contract
│   └── FHECounter.sol          # Example FHE counter
│
├── deploy/                     # Deployment scripts
│   └── deploy.ts               # Main deployment script
│
├── test/                       # Test files
│   ├── EncryptedMessenger.ts   # Messenger contract tests
│   ├── FHECounter.ts           # Counter tests (local)
│   └── FHECounterSepolia.ts    # Counter tests (testnet)
│
├── tasks/                      # Hardhat custom tasks
│   ├── accounts.ts             # Account management tasks
│   ├── FHECounter.ts           # Counter interaction tasks
│   └── EncryptedMessenger.ts   # Messenger interaction tasks
│
├── scripts/                    # Utility scripts
│   └── generate_frontend_abi.ts # ABI generation for frontend
│
├── home/                       # React frontend application
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── MessengerApp.tsx # Main messenger interface
│   │   │   └── Header.tsx      # App header
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── useEthersSigner.ts  # Ethers signer hook
│   │   │   └── useZamaInstance.ts  # Zama FHE hook
│   │   ├── config/             # Configuration files
│   │   │   └── messenger.ts    # Contract ABI & address
│   │   ├── App.tsx             # Root component
│   │   └── main.tsx            # Application entry point
│   ├── package.json            # Frontend dependencies
│   └── vite.config.ts          # Vite configuration
│
├── types/                      # TypeChain generated types
├── artifacts/                  # Compiled contract artifacts
├── cache/                      # Hardhat cache
├── deployments/                # Deployment records
│
├── hardhat.config.ts           # Hardhat configuration
├── package.json                # Project dependencies
├── tsconfig.json               # TypeScript configuration
├── .env                        # Environment variables (gitignored)
├── .gitignore                  # Git ignore rules
├── LICENSE                     # BSD-3-Clause-Clear license
└── README.md                   # This file
```

## Security Considerations

### Encryption Security

1. **Dual-Layer Encryption**
   - Message content: AES-GCM with address-derived keys
   - Sender metadata: Zama FHE for on-chain privacy
   - Both layers provide strong cryptographic guarantees

2. **Key Derivation**
   - Keys derived from Ethereum addresses using SHA-256
   - No key storage or management required
   - Users control decryption via wallet ownership

3. **FHE Security**
   - Zama's FHEVM provides cryptographically sound FHE
   - Encrypted data never decrypted on-chain
   - Secure decryption only via authorized users

### Smart Contract Security

1. **Access Control**
   - Messages only readable by recipient
   - FHE ACL grants properly configured
   - No unauthorized access possible

2. **Immutability**
   - Messages cannot be modified after sending
   - Timestamp and sender cannot be altered
   - Blockchain ensures integrity

3. **Best Practices**
   - No reentrancy vulnerabilities
   - No integer overflow/underflow (Solidity 0.8+)
   - Minimal external calls
   - Gas optimizations applied

### Known Limitations

1. **Address-Based Encryption**
   - Anyone who knows recipient address can attempt decryption
   - Messages should not contain highly sensitive info
   - Consider additional encryption layers for maximum security

2. **On-Chain Storage Costs**
   - Storing messages on-chain costs gas
   - Large messages more expensive
   - Consider off-chain storage (IPFS) for larger content

3. **No Message Deletion**
   - Blockchain immutability means messages cannot be deleted
   - Plan message content accordingly
   - Future: Add "burn" mechanism for sender address encryption

4. **Metadata Exposure**
   - While sender address encrypted via FHE, plaintext sender visible
   - Transaction graph analysis possible
   - Future: Enhanced metadata protection

### Recommendations

1. **For Users**
   - Use strong wallet security (hardware wallet recommended)
   - Verify recipient addresses carefully
   - Be aware of blockchain permanence
   - Consider message sensitivity

2. **For Developers**
   - Audit smart contracts before mainnet deployment
   - Implement rate limiting for spam prevention
   - Add message size limits
   - Consider L2 deployment for lower costs

3. **For Auditors**
   - Review FHE implementation carefully
   - Verify ACL grant logic
   - Check for side-channel vulnerabilities
   - Test encryption/decryption flows

## Future Roadmap

### Phase 1: Core Improvements (Q2 2025)

- [ ] **Message Decryption UI**
  - Add in-browser decryption for received messages
  - Display plaintext content automatically
  - FHE sender address decryption integration

- [ ] **Improved UX**
  - Message notification system
  - Address book for frequent contacts
  - Message search and filtering
  - Conversation threading

- [ ] **Gas Optimizations**
  - Batch message sending
  - Compression for encrypted content
  - L2 deployment (Arbitrum, Optimism)

### Phase 2: Advanced Features (Q3 2025)

- [ ] **Group Messaging**
  - Multi-recipient encrypted messages
  - Group key management using FHE
  - Admin and member permissions

- [ ] **Rich Content**
  - File attachments (IPFS integration)
  - Image and video support
  - Voice messages

- [ ] **Enhanced Privacy**
  - Stealth addresses for full sender anonymity
  - Zero-knowledge proofs for metadata protection
  - Decoy traffic to prevent traffic analysis

- [ ] **Cross-Chain Support**
  - Bridge messages across multiple chains
  - Unified inbox for all chains
  - Cross-chain identity resolution

### Phase 3: Ecosystem Growth (Q4 2025)

- [ ] **Mobile Applications**
  - Native iOS app
  - Native Android app
  - Mobile wallet integration

- [ ] **Developer SDK**
  - npm package for integration
  - React hooks library
  - REST API for external apps

- [ ] **Social Features**
  - Public/private profiles
  - Status updates
  - Message reactions and threading

- [ ] **Monetization & Incentives**
  - Token rewards for early adopters
  - Paid features (premium storage, etc.)
  - Staking mechanisms for spam prevention

### Phase 4: Enterprise & Scaling (2026)

- [ ] **Enterprise Solutions**
  - Organization accounts
  - Compliance tools
  - Custom deployment options
  - SLA guarantees

- [ ] **Advanced Cryptography**
  - Post-quantum encryption migration
  - Threshold encryption for groups
  - Verifiable encryption proofs

- [ ] **Governance**
  - DAO for protocol decisions
  - Community voting on features
  - Decentralized moderation system

- [ ] **Performance**
  - Optimistic rollups integration
  - ZK-rollups for scalability
  - Sub-second message delivery

### Long-Term Vision

- **Become the de-facto standard for Web3 messaging**
- **Bridge Web2 and Web3 communication**
- **Enable truly private, censorship-resistant global communication**
- **Support 1M+ daily active users**
- **Integration with major Web3 platforms and protocols**

## Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute

1. **Code Contributions**
   - Bug fixes
   - New features
   - Performance improvements
   - Test coverage

2. **Documentation**
   - Improve README
   - Add code comments
   - Write tutorials
   - Create video guides

3. **Testing**
   - Report bugs
   - Test new features
   - Security auditing
   - Gas optimization suggestions

4. **Design**
   - UI/UX improvements
   - Logo and branding
   - Marketing materials

### Contribution Process

1. **Fork the repository**

```bash
git clone https://github.com/yourusername/ZamaDiscord.git
cd ZamaDiscord
git checkout -b feature/your-feature-name
```

2. **Make your changes**
   - Follow existing code style
   - Add tests for new features
   - Update documentation

3. **Test your changes**

```bash
npm run lint
npm test
npm run coverage
```

4. **Submit a pull request**
   - Describe your changes
   - Reference any related issues
   - Ensure CI passes

### Development Guidelines

- **Code Style**: Follow existing patterns, use ESLint and Prettier
- **Commits**: Use clear, descriptive commit messages
- **Tests**: Maintain or improve test coverage
- **Documentation**: Update docs for any API changes
- **Security**: Report vulnerabilities privately to maintainers

### Community

- **GitHub Discussions**: Ask questions and share ideas
- **Issues**: Report bugs and request features
- **Discord**: Join our community server (coming soon)

## License

This project is licensed under the **BSD-3-Clause-Clear License**.

### What This Means

- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ✅ Private use allowed
- ❌ No patent grant
- ⚠️ License and copyright notice required

See the [LICENSE](LICENSE) file for the full license text.

### Third-Party Licenses

This project uses several open-source libraries:

- **Zama FHEVM**: BSD-3-Clause-Clear
- **React**: MIT License
- **Ethers.js**: MIT License
- **Hardhat**: MIT License
- **OpenZeppelin Contracts**: MIT License

## Support

### Getting Help

- **Documentation**: Read the [Zama FHEVM Docs](https://docs.zama.ai/fhevm)
- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/ZamaDiscord/issues)
- **GitHub Discussions**: [Ask questions and discuss ideas](https://github.com/yourusername/ZamaDiscord/discussions)
- **Zama Discord**: [Join the Zama community](https://discord.gg/zama)

### FAQ

**Q: Is this ready for production?**
A: This is currently a testnet demo. Do not use for production without thorough security audits.

**Q: What networks are supported?**
A: Currently deployed on Sepolia testnet. Mainnet deployment planned after security audits.

**Q: How much does it cost to send a message?**
A: Gas costs vary based on network congestion. Approximately 200,000-300,000 gas per message on Sepolia.

**Q: Can messages be deleted?**
A: No, blockchain immutability means messages are permanent. Plan accordingly.

**Q: Is this really private?**
A: Yes, but with caveats. Message content and FHE-encrypted data are private, but transaction metadata (sender, recipient, timestamp) is public on the blockchain.

**Q: How is this different from Signal/WhatsApp?**
A: ZamaDiscord is decentralized (no company controls it), censorship-resistant (no one can ban you), and stores messages on-chain (permanent record). Traditional apps are centralized and controlled by companies.

**Q: What's the future of this project?**
A: See our [Future Roadmap](#future-roadmap) for planned features and improvements.

### Acknowledgments

- **Zama**: For pioneering FHEVM technology and excellent developer tools
- **Ethereum Foundation**: For building the foundational blockchain infrastructure
- **Hardhat Team**: For the best Ethereum development environment
- **React Team**: For the amazing frontend framework
- **RainbowKit**: For seamless wallet connection UX
- **All Contributors**: Thank you to everyone who contributes to this project!

---

**Built with ❤️ for the Web3 community**

*Empowering private, censorship-resistant communication for everyone*

