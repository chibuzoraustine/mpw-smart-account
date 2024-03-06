// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract TestSigSplit {
    uint256 public ownersNonce = 0;

    function splitJointSignature(
        bytes memory jointSignature,
        bytes32 messageHash
    ) public pure returns (address[] memory signers) {
        uint256 signatureLength = 65;
        require(
            jointSignature.length % signatureLength == 0,
            "Invalid joint signature length"
        );

        uint256 numSignatures = jointSignature.length / signatureLength;
        signers = new address[](numSignatures);

        for (uint256 i = 0; i < numSignatures; i++) {
            bytes memory signature = new bytes(signatureLength);
            for (uint256 j = 0; j < signatureLength; j++) {
                signature[j] = jointSignature[i * signatureLength + j];
            }
            signers[i] = ECDSA.recover(
                ECDSA.toEthSignedMessageHash(messageHash),
                signature
            );
        }

        return signers;
    }

    function msgEncValidate(
        address newOwner
    ) external view returns (bytes32 messageHash) {
        // Compute the messageHash based on newOwner and nonce
        messageHash = keccak256(abi.encodePacked(newOwner, ownersNonce)); 
        return messageHash;
    } 
}
