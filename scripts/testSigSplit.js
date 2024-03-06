const hre = require("hardhat");
const crypto = require('crypto');

const ACCOUNT_ADDR = "0xe892ff77c348d03f6eaeafa75ccf73e982cb7937";

function hashData(data) {
  const str = JSON.stringify(data);
  const hash = crypto.createHash('sha256');
  hash.update(str);
  return hre.ethers.getBytes('0x' + hash.digest('hex'));
}

async function main() {

  const [adminSigner0, adminSigner1] = await hre.ethers.getSigners();
  const newOwner = await adminSigner1.getAddress();
  // const nonce = await account.ownersNonce();
  // console.log(nonce.toString())
  const msgHash = hre.ethers.solidityPackedKeccak256(
    ['address', 'uint256'],
    [newOwner.toLowerCase(), 0]
  )

  const signer0 = await adminSigner0.signMessage(hre.ethers.getBytes(msgHash));
  // const signer1 = await adminSigner1.signMessage(msgHash);
  const jointSig = signer0 

  // console.log('Joint sig', jointSig)

  const testSigSplitAddress = "0x77B55D40DDBBffd8f6e891769bFF83B5696aa123";
  const account = await hre.ethers.getContractAt("TestSigSplit", testSigSplitAddress);
  const recovered = await account.splitJointSignature(jointSig, msgHash);
  console.log(recovered);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
