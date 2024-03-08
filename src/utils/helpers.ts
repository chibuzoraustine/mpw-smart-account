// import { RESULT_PER_PAGE } from "../v1/config.js";
import Joi from "joi";
import crypto from "crypto";
import ethers, {AlchemyProvider, Wallet} from "ethers";

export function getChainDetails(chain: string): { 
    EP_ADDRESS: string, 
    AF_ADDRESS: string, 
    PM_ADDRESS: string, 
    RPC_URL: string, 
    provider: ethers.ethers.JsonRpcProvider
} {
    switch (chain) {
        case "421614":
            return {
                EP_ADDRESS: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
                AF_ADDRESS: "0xDb59a1e7837b5198C225DF8f582F2C453e6073F1",
                PM_ADDRESS: "0x31bA9B169E3E0B9766233D63bC657d98c5DaA46F",
                RPC_URL: process.env.ARBITRUM_SEPOLIA_RPC_URL!,
                provider: new AlchemyProvider("arbitrum-sepolia", process.env.ALCHEMY_API_KEY!)
            }
        default:
            return {
                EP_ADDRESS: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
                AF_ADDRESS: "0xDb59a1e7837b5198C225DF8f582F2C453e6073F1",
                PM_ADDRESS: "0x31bA9B169E3E0B9766233D63bC657d98c5DaA46F",
                RPC_URL: process.env.ARBITRUM_SEPOLIA_RPC_URL!,
                provider: new AlchemyProvider("arbitrum-sepolia", process.env.ALCHEMY_API_KEY!)
            }
    }
}

export function getTokenDetailsByWalletType(type: string): {token_name:string, token_address: string} {
    switch (type) {
        case "usdt_arbitrum":            
            return {
                token_name: "usdt",
                token_address: "0xEB640BA62488f947E51f9f110ed3a06Ee9931D05"
            }
    
        default:
            return {
                token_name: "usdt",
                token_address: "0xEB640BA62488f947E51f9f110ed3a06Ee9931D05"
            }
    }
}

export function getAdminSigner(chain: string): Wallet {
    return new Wallet(process.env.TEST_PRIVATE_KEY!, getChainDetails(chain).provider)
}

export function getDummySignatureByTotalSignersLength(signers_length: number) {
    let _sig = "0x"
    for (let index = 0; index < signers_length; index++) {
        _sig += "fffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
    }
    return _sig
};

export function hashData(data: any) {
    const str = JSON.stringify(data);
    const hash = crypto.createHash('sha256');
    hash.update(str);
    return hash.digest('hex');
}

export function padHexString(hexString: any) {
    return '0x' + hexString.padStart(64, '0');
}

export function isValidEVMAddress(address: string): boolean {
    const regex = /^(0x)?[0-9a-fA-F]{40}$/;
    return regex.test(address);
}

export function ucfirst(str: string) {
    //convert first letter to uppercase
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str: string, length = 25) {
    if (str.length < 1) return
    let truncatedString = str
    if (length > 10 && str.length > length) {
        truncatedString = str.substring(0, length - 3) + ' ...'
    }
    return truncatedString
}

export function handlePaginate(_page: number, _resultPerPage = 10) {
    return {
        offset: (_page - 1) * _resultPerPage,
        limit: _resultPerPage
    }
}

export function generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

export function addSecondsToDate(seconds: number): Date {
    const currentDate = new Date();
    const futureDate = new Date(currentDate.getTime() + seconds * 1000);
    return futureDate;
}

export function currencyFormat(data: number) {
    let formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        // These options are needed to round to whole numbers.
        //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
        //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
    });

    return formatter.format(data)
}

export function handleValidationErrors(error: Array<Joi.ValidationErrorItem>) {
    throw error;
}