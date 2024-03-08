import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config"

const config: HardhatUserConfig =  {
  defaultNetwork: "arbitrum_sepolia",
  networks: {
    arbitrum_sepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL,
      accounts: [process.env.TEST_PRIVATE_KEY!, process.env.TEST_PRIVATE_KEY2!, process.env.TEST_PRIVATE_KEY3!],
    },
  },
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
};

export default config;