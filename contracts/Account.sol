// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@account-abstraction/contracts/core/EntryPoint.sol";
import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Create2.sol";

contract Account is IAccount {
    uint256 public count;
    address[] public signers;
    mapping(address => bool) public isSigner;
    uint256 public signersNonce;

    constructor(address initialOwner) {
        signers.push(initialOwner);
        isSigner[initialOwner] = true;
    }

    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256
    ) external view override returns (uint256 validationData) {
        if (userOp.signature.length > 0) {
            // Split the joint signature into individual signatures and recover signers
            address[] memory _signers = splitJointSignature(
                userOp.signature,
                userOpHash
            );
            if (_signers.length == signers.length) {
                bool err = false;
                // Validate that all signers are among the signers
                for (uint256 i = 0; i < _signers.length; i++) {
                    if (!isSigner[_signers[i]]) {
                        err = true;
                        break;
                    }
                }
                return err == true ? 1 : 0;
            }
        }
        return 1;
    }

    function addSigner(
        address newSigner,
        bytes calldata jointSignature
    ) external {
        require(!isSigner[newSigner], "New owner already exists");

        // Compute the messageHash based on newSigner and nonce
        bytes32 messageHash = keccak256(
            abi.encodePacked(newSigner, signersNonce)
        );

        // Validate that all previous signers have signed
        address[] memory _signers = splitJointSignature(
            jointSignature,
            messageHash
        );
        require(
            _signers.length == signers.length,
            "Number of _signers doesn't match number of _signers"
        );

        for (uint256 i = 0; i < _signers.length; i++) {
            require(isSigner[_signers[i]], "Invalid signer");
        }

        // Add new owner
        signersNonce = signersNonce + 1;
        signers.push(newSigner);
        isSigner[newSigner] = true;
    }

    function deleteSigner(
        address signer,
        bytes calldata jointSignature
    ) external {
        require(isSigner[signer], "Invalid signer");

        // Compute the messageHash based on signer and nonce
        bytes32 messageHash = keccak256(abi.encodePacked(signer, signersNonce));

        // Validate that all previous signers have signed
        address[] memory _signers = splitJointSignature(
            jointSignature,
            messageHash
        );
        require(
            _signers.length == signers.length,
            "Number of _signers doesn't match number of _signers"
        );

        for (uint256 i = 0; i < _signers.length; i++) {
            require(isSigner[_signers[i]], "Invalid signer");
        }

        signersNonce = signersNonce + 1;
        isSigner[signer] = false;

        for (uint i = 0; i < signers.length; i++) {
            if (signers[i] == signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
            }
        }
    }

    function splitJointSignature(
        bytes memory jointSignature,
        bytes32 messageHash
    ) internal pure returns (address[] memory) {
        uint256 signatureLength = 65;
        require(
            jointSignature.length % signatureLength == 0,
            "Invalid joint signature length"
        );

        uint256 numSignatures = jointSignature.length / signatureLength;
        address[] memory _signers = new address[](numSignatures);

        for (uint256 i = 0; i < numSignatures; i++) {
            bytes memory signature = new bytes(signatureLength);
            for (uint256 j = 0; j < signatureLength; j++) {
                signature[j] = jointSignature[i * signatureLength + j];
            }
            _signers[i] = ECDSA.recover(
                ECDSA.toEthSignedMessageHash(messageHash),
                signature
            );
        }

        return _signers;
    }

    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    function execute() external {
        count++;
    }
}

contract AccountFactory {
    function createAccount(
        address owner,
        bytes32 salt
    ) external returns (address) {
        // bytes32 salt = bytes32(uint256(uint160(owner)));
        bytes memory creationCode = type(Account).creationCode;
        bytes memory bytecode = abi.encodePacked(
            creationCode,
            abi.encode(owner)
        );

        address addr = Create2.computeAddress(salt, keccak256(bytecode));
        uint256 codeSize = addr.code.length;
        if (codeSize > 0) {
            return addr;
        }

        return deploy(salt, bytecode);
    }

    function deploy(
        bytes32 salt,
        bytes memory bytecode
    ) internal returns (address addr) {
        require(bytecode.length != 0, "Create2: bytecode length is zero");
        /// @solidity memory-safe-assembly
        assembly {
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        require(addr != address(0), "Create2: Failed on deploy");
    }
}
