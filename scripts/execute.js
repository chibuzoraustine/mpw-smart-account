const hre = require("hardhat");

const FACTORY_ADDRESS = "0x38aE206f81c52B269B67f613C3Ca8974e3A5b071";
const EP_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const PM_ADDRESS = "0x31bA9B169E3E0B9766233D63bC657d98c5DaA46F";

async function main() {
  const entryPoint = await hre.ethers.getContractAt("EntryPoint", EP_ADDRESS);

  const AccountFactory = await hre.ethers.getContractFactory("AccountFactory");
  const [signer0, signer1] = await hre.ethers.getSigners();
  const address0 = await signer0.getAddress();
  let initCode =
    FACTORY_ADDRESS +
    AccountFactory.interface
      .encodeFunctionData("createAccount", [address0])
      .slice(2);

  let sender;
  try {
    await entryPoint.getSenderAddress(initCode);
  } catch (ex) {
    sender = "0x" + ex.data.slice(-40);
  }

  const code = await ethers.provider.getCode(sender);
  if (code !== "0x") {
    initCode = "0x";
  }

  console.log({ sender });

  const Account = await hre.ethers.getContractFactory("Account");
  const userOp = {
    sender, // smart account address
    nonce: "0x" + (await entryPoint.getNonce(sender, 0)).toString(16),
    initCode,
    callData: Account.interface.encodeFunctionData("execute"),
    paymasterAndData: PM_ADDRESS,
    signature:
      "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c",
  };

  const { preVerificationGas, verificationGasLimit, callGasLimit } =
    await ethers.provider.send("eth_estimateUserOperationGas", [
      userOp,
      EP_ADDRESS,
    ]);

  userOp.preVerificationGas = preVerificationGas;
  userOp.verificationGasLimit = verificationGasLimit;
  userOp.callGasLimit = callGasLimit;

  const { maxFeePerGas } = await ethers.provider.getFeeData();
  userOp.maxFeePerGas = "0x" + maxFeePerGas.toString(16);

  const maxPriorityFeePerGas = await ethers.provider.send(
    "rundler_maxPriorityFeePerGas"
  );
  userOp.maxPriorityFeePerGas = maxPriorityFeePerGas;

  const userOpHash = await entryPoint.getUserOpHash(userOp);
  userOp.signature = await signer0.signMessage(hre.ethers.getBytes(userOpHash));

  const opHash = await ethers.provider.send("eth_sendUserOperation", [
    userOp,
    EP_ADDRESS,
  ]);

  setTimeout(async () => {
    const { transactionHash } = await ethers.provider.send(
      "eth_getUserOperationByHash",
      [opHash]
    );

    console.log(transactionHash);
  }, 5000);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
