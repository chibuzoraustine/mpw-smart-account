import hre from "hardhat";
import crypto from "crypto"

const FACTORY_ADDRESS = "0xDb59a1e7837b5198C225DF8f582F2C453e6073F1";
const EP_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const ACCOUNT_ADDR = "0x20830ce1b0b7b04b2f24117bf09ba8cc4c6bc880";

function hashData(data: any) {
  const str = JSON.stringify(data);
  const hash = crypto.createHash('sha256');
  hash.update(str);
  return hash.digest('hex');
}

function padHexString(hexString: any) {
  return '0x' + hexString.padStart(64, '0');
}

function toBytes(data: any) {
  return hre.ethers.getBytes(data);
}

async function main() {
  const account = await hre.ethers.getContractAt("Account", ACCOUNT_ADDR);
  const entryPoint = await hre.ethers.getContractAt("EntryPoint", EP_ADDRESS);
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
      .encodeFunctionData("createAccount", [adminAddress, userAccountSalt, EP_ADDRESS])
      .slice(2);

  let userAddress:string = "";
  try {
    await entryPoint.getSenderAddress(initCode);
  } catch (ex: any) {
    userAddress = "0x" + ex.data.slice(-40);
  }

  const code = await hre.ethers.provider.getCode(userAddress);
  if (code == "0x") {
    console.log("Make at least one transaction before adding signers");
    process.exit(1)
  }

  const newSigner = await adminSigner2.getAddress();
  const nonce = await account.signersNonce();
  console.log(nonce.toString())
  const msgHash = hre.ethers.solidityPackedKeccak256(
    ['address', 'uint256'],
    [newSigner.toLowerCase(), nonce]
  )

  // console.log(msgHash)

  const signature0 = await adminSigner0.signMessage(hre.ethers.getBytes(msgHash));
  const signature1 = await adminSigner1.signMessage(hre.ethers.getBytes(msgHash));

  const jointSig = signature0 + signature1.slice(2);
  console.log('Joint sig', jointSig)

  try {
    const tnx = await account.addSigner(newSigner, jointSig);
    await tnx.wait();
  } catch (error: any) {
    if (error.message && error.message.includes("New owner already exists")) {
      // Handle the specific error message
      console.error("New owner already exists");
  } else {
      // Handle other errors
      console.error(error);
  }
  }

  // const signers = await account.getSigners();
  // console.log(signers[0])
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
