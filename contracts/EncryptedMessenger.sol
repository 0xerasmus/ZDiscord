// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title EncryptedMessenger
/// @notice Store and deliver messages where content is off-chain encrypted and an address is Zama-encrypted on-chain
contract EncryptedMessenger is SepoliaConfig {
    struct Message {
        address sender;
        uint256 timestamp;
        string encryptedContent; // Encrypted off-chain with EVM address as key
        eaddress encryptedAddress; // Zama encrypted address stored on-chain
    }

    // recipient => list of messages received
    mapping(address => Message[]) private _inbox;

    event MessageSent(address indexed to, address indexed from, uint256 indexed index, uint256 timestamp);

    /// @notice Send a message to a recipient
    /// @param to Recipient address
    /// @param encryptedContent Off-chain encrypted content string
    /// @param encAddr External encrypted address handle
    /// @param inputProof Zama input proof
    function sendMessage(
        address to,
        string calldata encryptedContent,
        externalEaddress encAddr,
        bytes calldata inputProof
    ) external {
        eaddress zaddr = FHE.fromExternal(encAddr, inputProof);

        Message memory m = Message({
            sender: msg.sender,
            timestamp: block.timestamp,
            encryptedContent: encryptedContent,
            encryptedAddress: zaddr
        });

        _inbox[to].push(m);

        // Grant ACL so both recipient and sender can decrypt the eaddress if needed
        FHE.allowThis(zaddr);
        FHE.allow(zaddr, to);
        FHE.allow(zaddr, msg.sender);

        emit MessageSent(to, msg.sender, _inbox[to].length - 1, m.timestamp);
    }

    /// @notice Get number of messages for a given user
    /// @dev Do not use msg.sender per requirements; address is provided explicitly
    function getMessageCount(address user) external view returns (uint256) {
        return _inbox[user].length;
    }

    /// @notice Get a message record by user and index
    /// @dev Returns the encrypted address handle so client can request user decryption
    function getMessageAt(
        address user,
        uint256 index
    ) external view returns (address from, uint256 timestamp, string memory encryptedContent, eaddress encryptedAddr) {
        Message storage m = _inbox[user][index];
        return (m.sender, m.timestamp, m.encryptedContent, m.encryptedAddress);
    }
}

