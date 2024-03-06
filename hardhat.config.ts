require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  defaultNetwork: "arbitrum",
  networks: {
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL,
      accounts: [process.env.TEST_PRIVATE_KEY, process.env.TEST_PRIVATE_KEY2, process.env.TEST_PRIVATE_KEY3],
    },
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
};
