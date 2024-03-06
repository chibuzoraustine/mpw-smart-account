import hre from "hardhat"

const ACCOUNT_ADDR = "0xe892ff77c348d03f6eaeafa75ccf73e982cb7937";

async function main() {
  const account = await hre.ethers.getContractAt("Account", ACCOUNT_ADDR);
  const count = await account.count();
  console.log(count);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
