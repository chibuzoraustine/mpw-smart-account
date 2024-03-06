const hre = require("hardhat");
const crypto = require('crypto');

const FACTORY_ADDRESS = "0x43dA92C8Ddd8d62A6CF46A2087bDF9e9F127C32F";
const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const PAYMASTER_ADDRESS = "0x31bA9B169E3E0B9766233D63bC657d98c5DaA46F";

function hashData(data) {
    const str = JSON.stringify(data);
    const hash = crypto.createHash('sha256');
    hash.update(str);
    return hash.digest('hex');
}

function padHexString(hexString) {
    return '0x' + hexString.padStart(64, '0');
}

function getDummySignatureByTotalSignersLength(signers_length) {
    let _sig = "0x"
    for (let index = 0; index < signers_length; index++) {
        _sig += "fffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
    }
    return _sig
}; 

async function main() {
    const entryPoint = await hre.ethers.getContractAt("EntryPoint", ENTRYPOINT_ADDRESS);
    const AccountFactory = await hre.ethers.getContractFactory("AccountFactory");
    const [adminSigner0, adminSigner1, adminSigner2] = await hre.ethers.getSigners();
    const adminAddress = await adminSigner0.getAddress();
    const userDataHash = hashData({
        id: 1,
        chain: "arbitrum",
        type: "usdt"
    })
    const userAccountSalt = padHexString(userDataHash);
    console.log('user account salt', userAccountSalt)
    let initCode =
        FACTORY_ADDRESS +
        AccountFactory.interface
            .encodeFunctionData("createAccount", [adminAddress, userAccountSalt])
            .slice(2);

    let userAddress;
    try {
        await entryPoint.getSenderAddress(initCode);
    } catch (ex) {
        userAddress = "0x" + ex.data.slice(-40);
    }

    const code = await ethers.provider.getCode(userAddress);
    if (code !== "0x") {
        initCode = "0x";
    }

    console.log({ userAddress });

    // initialize userOp
    const Account = await hre.ethers.getContractFactory("Account");
    const userOp = {
        sender: userAddress, // smart account address
        nonce: "0x" + (await entryPoint.getNonce(userAddress, 0)).toString(16),
        initCode,
        callData: Account.interface.encodeFunctionData("execute"),
        paymasterAndData: PAYMASTER_ADDRESS,
        signature: getDummySignatureByTotalSignersLength(3),
    };

    const { preVerificationGas, verificationGasLimit, callGasLimit } =
        await ethers.provider.send("eth_estimateUserOperationGas", [
            userOp,
            ENTRYPOINT_ADDRESS,
        ]);

    console.log("preVerificationGas", parseInt(preVerificationGas))
    console.log("verificationGasLimit", parseInt(verificationGasLimit))
    console.log("callGasLimit", parseInt(callGasLimit))

    // update userOp with relevant gas info 
    userOp.preVerificationGas = preVerificationGas;
    userOp.verificationGasLimit = verificationGasLimit;
    userOp.callGasLimit = callGasLimit;

    // get more relevant gas info and update userOp
    const { maxFeePerGas } = await ethers.provider.getFeeData();
    const maxPriorityFeePerGas = await ethers.provider.send(
        "rundler_maxPriorityFeePerGas"
    );
    console.log("maxFeePerGas", parseInt(maxFeePerGas))
    console.log("maxPriorityFeePerGas", parseInt(maxPriorityFeePerGas))

    userOp.maxFeePerGas = "0x" + maxFeePerGas.toString(16);
    userOp.maxPriorityFeePerGas = maxPriorityFeePerGas;

    // Sign userOp hash with account signer
    const userOpHash = await entryPoint.getUserOpHash(userOp);
    const signature0 = await adminSigner0.signMessage(hre.ethers.getBytes(userOpHash));
    const signature1 = await adminSigner1.signMessage(hre.ethers.getBytes(userOpHash));
    const signature2 = await adminSigner2.signMessage(hre.ethers.getBytes(userOpHash));   
    userOp.signature = signature0 + signature1.slice(2) + signature2.slice(2);

    console.log(userOp.signature);

    // execute transaction
    const opTxHash = await ethers.provider.send("eth_sendUserOperation", [
        userOp,
        ENTRYPOINT_ADDRESS,
    ]);

    // wait for tnx and get bundler tx hash
    setTimeout(async () => {
        const { transactionHash } = await ethers.provider.send(
            "eth_getUserOperationByHash",
            [opTxHash]
        );

        console.log(transactionHash);
    }, 5000);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});