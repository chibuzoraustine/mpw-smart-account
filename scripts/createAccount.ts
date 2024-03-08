import hre from "hardhat"
import crypto from "crypto"

const FACTORY_ADDRESS = "0xDb59a1e7837b5198C225DF8f582F2C453e6073F1";
const EP_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
// const PM_ADDRESS = "0x31bA9B169E3E0B9766233D63bC657d98c5DaA46F";

function hashData(data: any) {
    const str = JSON.stringify(data);
    const hash = crypto.createHash('sha256');
    hash.update(str);
    return hash.digest('hex');
}

function padHexString(hexString: any) {
    return '0x' + hexString.padStart(64, '0');
}

async function main() {
    const entryPoint = await hre.ethers.getContractAt("EntryPoint", EP_ADDRESS);

    const AccountFactory = await hre.ethers.getContractFactory("AccountFactory");
    const [adminSigner0] = await hre.ethers.getSigners();
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

    let userAddress = "";
    try {
        await entryPoint.getSenderAddress(initCode);
    } catch (ex: any) {
        userAddress = "0x" + ex.data.slice(-40);
    }

    const code = await hre.ethers.provider.getCode(userAddress);
    if (code !== "0x") {
        initCode = "0x";
    }

    console.log({ userAddress });

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
