// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@account-abstraction/contracts/core/EntryPoint.sol";
import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Create2.sol";

contract Account is IAccount {
    IEntryPoint public immutable entryPoint;
    uint256 public count;
    address public admin;
    address[] public signers;
    mapping(address => bool) public isSigner;
    uint256 public signersNonce;
    error NotAuthorizedCaller();

    struct Call {
        address to;
        uint256 value;
        bytes data;
    }

    constructor(address initialOwner, IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;
        admin = initialOwner;
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
        require(signer != admin, "Can not delete admin");
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

    /// @notice Executes a function call to an external contract
    /// @param to The address of the target contract
    /// @param value The amount of Ether to send
    /// @param data The call data to be sent
    function execute(
        address to,
        uint256 value,
        bytes memory data
    ) external payable {
        if (msg.sender != address(entryPoint) && msg.sender != address(this)) {
            revert NotAuthorizedCaller();
        }
        assembly {
            let success := call(
                gas(),
                to,
                value,
                add(data, 0x20),
                mload(data),
                0,
                0
            )
            returndatacopy(0, 0, returndatasize())
            switch success
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    /// @notice Executes a function call to an external contract with delegatecall
    /// @param to The address of the target contract
    /// @param data The call data to be sent
    function executeDelegateCall(
        address to,
        bytes memory data
    ) external payable {
        if (msg.sender != address(entryPoint) && msg.sender != address(this)) {
            revert NotAuthorizedCaller();
        }
        assembly {
            let success := delegatecall(
                gas(),
                to,
                add(data, 0x20),
                mload(data),
                0,
                0
            )
            returndatacopy(0, 0, returndatasize())
            switch success
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    /// @notice Executes a function call to an external contract batched
    /// @param calls The calls to be executed, in order
    /// @dev operation deprecated param, use executeBatch for batched transaction
    function executeBatch(Call[] memory calls) external payable {
        if (msg.sender != address(entryPoint)) {
            revert NotAuthorizedCaller();
        }
        uint256 len = calls.length;
        for (uint256 i = 0; i < len; ) {
            Call memory call = calls[i];
            address to = call.to;
            uint256 value = call.value;
            bytes memory data = call.data;
            assembly {
                let success := call(
                    gas(),
                    to,
                    value,
                    add(data, 0x20),
                    mload(data),
                    0,
                    0
                )
                switch success
                case 0 {
                    returndatacopy(0, 0, returndatasize())
                    revert(0, returndatasize())
                }
                default {
                    i := add(i, 1)
                }
            }
        }
    }
}

contract AccountFactory {
    function createAccount(
        address owner,
        bytes32 salt,
        IEntryPoint entryPoint
    ) external returns (address) {
        // bytes32 salt = bytes32(uint256(uint160(owner)));
        bytes memory creationCode = type(Account).creationCode;
        bytes memory bytecode = abi.encodePacked(
            creationCode,
            abi.encode(owner),
            abi.encode(entryPoint)
        );

        address addr = Create2.computeAddress(salt, keccak256(bytecode));
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(addr)
        }
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
