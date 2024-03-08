import { Request } from "express";
import AuthUser from "../utils/authUser";
import walletModel from "../models/walletModel";
import dynamicWalletModel from "../models/dynamicWalletModel";
import { BadRequestError } from "../utils/errors";
import {
    AddUserWalletCosignerValidationSchema,
    CreateDynamicWalletValidationSchema,
    CreateUserWalletValidationSchema,
    DeleteUserWalletCosignerValidationSchema,
    SettleDynamicWalletValidationSchema,
    WalletTransferBatchValidationSchema,
    WalletTransferValidationSchema
} from "../types/validation.types";
import { Contract, ContractFactory, getBytes, parseEther, parseUnits, solidityPackedKeccak256 } from "ethers";
import { getChainDetails, getAdminSigner, hashData, padHexString, getTokenDetailsByWalletType, isValidEVMAddress, getDummySignatureByTotalSignersLength, generateRandomString, addSecondsToDate } from "../utils/helpers";
import { abi as ENTRYPOINT_ABI } from "@account-abstraction/contracts/artifacts/EntryPoint.json"
import ACCOUNT_FACTORY_ARTIFACT from "../../artifacts/contracts/Account.sol/AccountFactory.json"
import { abi as ERC20_ABI } from "../../artifacts/contracts/MockERC20.sol/MockERC20.json"
import ACCOUNT, { abi as ACCOUNT_ABI } from "../../artifacts/contracts/Account.sol/Account.json"
import { UserOperationStruct } from "../../typechain-types/contracts/Paymaster";
import { CallData } from "../types/global.types";
import userModel from "../models/userModel";
import { DYNAMIC_WALLET_SERVICE_CHARGE_PERCENTAGE } from "../utils/constants";

export async function getUserWallets(req: Request) {
    const resp = await walletModel.find({ user: AuthUser(req).id }).select('salt chain type address');
    return resp;
}

export async function createUserWallet(req: Request, body: CreateUserWalletValidationSchema) {
    const { chain, type } = body;
    const checkIfWalletExist = await walletModel.findOne({ user: AuthUser(req).id, chain, type });
    if (checkIfWalletExist) throw new BadRequestError("Wallet already exist for this chain and type");
    const userDataHash = hashData({
        id: AuthUser(req).id,
        chain,
        type
    })
    const { address, salt } = await createWallet(chain, userDataHash);
    const { token_address, token_name } = getTokenDetailsByWalletType(type);
    await walletModel.create({
        address,
        salt,
        user: AuthUser(req).id,
        chain,
        type,
        token_name,
        token_address
    });
    return { address, salt };
}

export async function walletTransfer(req: Request, body: WalletTransferValidationSchema) {
    const { wallet_address, amount, to_address, signatures } = body;
    if (!isValidEVMAddress(to_address)) throw new BadRequestError("to_address is not a valid evm address")
    const walletAddress = await walletModel.findOne({ user: AuthUser(req).id, address: wallet_address });
    if (!walletAddress) throw new BadRequestError("You do not own this address");

    const adminSigner = getAdminSigner(walletAddress.chain)
    const entryPoint = new Contract(getChainDetails(walletAddress.chain).EP_ADDRESS, ENTRYPOINT_ABI, adminSigner);
    const AccountFactory = new ContractFactory(ACCOUNT_FACTORY_ARTIFACT.abi, ACCOUNT_FACTORY_ARTIFACT.bytecode);
    const WalletAccountContract = new Contract(walletAddress.address, ACCOUNT_ABI, adminSigner);
    const Account = new ContractFactory(ACCOUNT.abi, ACCOUNT.bytecode);
    const ERC20_CONTRACT = new Contract(walletAddress.token_address, ERC20_ABI, adminSigner);
    const adminAddress = await adminSigner.getAddress();

    let initCode =
        getChainDetails(walletAddress.chain).AF_ADDRESS +
        AccountFactory.interface
            .encodeFunctionData("createAccount", [adminAddress, walletAddress.salt, getChainDetails(walletAddress.chain).EP_ADDRESS])
            .slice(2);

    let signers = [];
    const code = await getChainDetails(walletAddress.chain).provider.getCode(walletAddress.address);
    if (code !== "0x") {
        initCode = "0x";
        signers = await WalletAccountContract.getSigners();
    }

    const tokenDecimals = await ERC20_CONTRACT.decimals();
    console.log(tokenDecimals);
    const tokenContract = new Contract(walletAddress.token_address, ERC20_ABI);
    const tnxData = tokenContract.interface.encodeFunctionData("transfer", [to_address, parseUnits(amount, tokenDecimals)]);

    const userOp: Partial<UserOperationStruct> = {
        sender: walletAddress.address, // smart account address
        nonce: "0x" + (await entryPoint.getNonce(walletAddress.address, 0)).toString(16),
        initCode,
        callData: Account.interface.encodeFunctionData("execute", [walletAddress.token_address, 0, tnxData]),
        paymasterAndData: getChainDetails(walletAddress.chain).PM_ADDRESS,
        signature: getDummySignatureByTotalSignersLength(signers.length > 0 ? signers.length : 1),
    };

    const { preVerificationGas, verificationGasLimit, callGasLimit } =
        await getChainDetails(walletAddress.chain).provider.send("eth_estimateUserOperationGas", [
            userOp,
            getChainDetails(walletAddress.chain).EP_ADDRESS,
        ]);

    console.log("preVerificationGas", parseInt(preVerificationGas))
    console.log("verificationGasLimit", parseInt(verificationGasLimit))
    console.log("callGasLimit", parseInt(callGasLimit))

    // update userOp with relevant gas info 
    userOp.preVerificationGas = preVerificationGas;
    userOp.verificationGasLimit = verificationGasLimit;
    userOp.callGasLimit = callGasLimit;

    // get more relevant gas info and update userOp
    const { maxFeePerGas } = await getChainDetails(walletAddress.chain).provider.getFeeData();
    const maxPriorityFeePerGas = await getChainDetails(walletAddress.chain).provider.send(
        "rundler_maxPriorityFeePerGas",
        []
    );
    console.log("maxFeePerGas", parseInt(maxFeePerGas!.toString()))
    console.log("maxPriorityFeePerGas", parseInt(maxPriorityFeePerGas))

    userOp.maxFeePerGas = "0x" + maxFeePerGas!.toString(16);
    userOp.maxPriorityFeePerGas = maxPriorityFeePerGas;

    // Sign userOp hash with account signer
    const userOpHash = await entryPoint.getUserOpHash(userOp as UserOperationStruct);
    const adminSignature = await adminSigner.signMessage(getBytes(userOpHash))
    const cosignerSignatures = signatures === undefined ? "" : signatures.slice(2)
    const completeSignatures = adminSignature + cosignerSignatures;

    userOp.signature = completeSignatures;

    // execute transaction
    const opTxHash = await getChainDetails(walletAddress.chain).provider.send("eth_sendUserOperation", [
        userOp,
        getChainDetails(walletAddress.chain).EP_ADDRESS,
    ]);

    return {
        message: `${amount} ${walletAddress.token_name} sent to ${to_address} successfully`,
        userOpHash: opTxHash
    };
}

export async function walletTransferBatch(req: Request, body: WalletTransferBatchValidationSchema) {
    const { wallet_address, transactions, signatures } = body;
    transactions.forEach((tnx) => {
        if (!isValidEVMAddress(tnx.to_address)) throw new BadRequestError(`${tnx.to_address} is not a valid evm address`);
    })

    const walletAddress = await walletModel.findOne({ user: AuthUser(req).id, address: wallet_address });
    if (!walletAddress) throw new BadRequestError("You do not own this address");

    const adminSigner = getAdminSigner(walletAddress.chain)
    const entryPoint = new Contract(getChainDetails(walletAddress.chain).EP_ADDRESS, ENTRYPOINT_ABI, adminSigner);
    const AccountFactory = new ContractFactory(ACCOUNT_FACTORY_ARTIFACT.abi, ACCOUNT_FACTORY_ARTIFACT.bytecode);
    const WalletAccountContract = new Contract(walletAddress.address, ACCOUNT_ABI, adminSigner);
    const Account = new ContractFactory(ACCOUNT.abi, ACCOUNT.bytecode);
    const ERC20_CONTRACT = new Contract(walletAddress.token_address, ERC20_ABI, adminSigner);
    const adminAddress = await adminSigner.getAddress();

    let initCode =
        getChainDetails(walletAddress.chain).AF_ADDRESS +
        AccountFactory.interface
            .encodeFunctionData("createAccount", [adminAddress, walletAddress.salt, getChainDetails(walletAddress.chain).EP_ADDRESS])
            .slice(2);

    let signers = [];
    const code = await getChainDetails(walletAddress.chain).provider.getCode(walletAddress.address);
    if (code !== "0x") {
        initCode = "0x";
        signers = await WalletAccountContract.getSigners();
    }

    const tokenDecimals = await ERC20_CONTRACT.decimals();
    console.log(tokenDecimals);

    // Encode each Call struct
    const calls: CallData[] = transactions.map((c) => {
        const tokenContract = new Contract(walletAddress.token_address, ERC20_ABI);
        const tnxData = tokenContract.interface.encodeFunctionData("transfer", [c.to_address, parseUnits(c.amount, tokenDecimals)]);
        return {
            to: c.to_address,
            value: 0,
            data: tnxData
        }
    })

    const userOp: Partial<UserOperationStruct> = {
        sender: walletAddress.address, // smart account address
        nonce: "0x" + (await entryPoint.getNonce(walletAddress.address, 0)).toString(16),
        initCode,
        callData: Account.interface.encodeFunctionData("executeBatch", [calls]),
        paymasterAndData: getChainDetails(walletAddress.chain).PM_ADDRESS,
        signature: getDummySignatureByTotalSignersLength(signers.length > 0 ? signers.length : 1),
    };

    const { preVerificationGas, verificationGasLimit, callGasLimit } =
        await getChainDetails(walletAddress.chain).provider.send("eth_estimateUserOperationGas", [
            userOp,
            getChainDetails(walletAddress.chain).EP_ADDRESS,
        ]);

    console.log("preVerificationGas", parseInt(preVerificationGas))
    console.log("verificationGasLimit", parseInt(verificationGasLimit))
    console.log("callGasLimit", parseInt(callGasLimit))

    // update userOp with relevant gas info 
    userOp.preVerificationGas = preVerificationGas;
    userOp.verificationGasLimit = verificationGasLimit;
    userOp.callGasLimit = callGasLimit;

    // get more relevant gas info and update userOp
    const { maxFeePerGas } = await getChainDetails(walletAddress.chain).provider.getFeeData();
    const maxPriorityFeePerGas = await getChainDetails(walletAddress.chain).provider.send(
        "rundler_maxPriorityFeePerGas",
        []
    );
    console.log("maxFeePerGas", parseInt(maxFeePerGas!.toString()))
    console.log("maxPriorityFeePerGas", parseInt(maxPriorityFeePerGas))

    userOp.maxFeePerGas = "0x" + maxFeePerGas!.toString(16);
    userOp.maxPriorityFeePerGas = maxPriorityFeePerGas;

    // Sign userOp hash with account signer
    const userOpHash = await entryPoint.getUserOpHash(userOp as UserOperationStruct);
    const adminSignature = await adminSigner.signMessage(getBytes(userOpHash))
    const cosignerSignatures = signatures === undefined ? "" : signatures.slice(2)
    const completeSignatures = adminSignature + cosignerSignatures;

    userOp.signature = completeSignatures;

    // execute transaction
    const opTxHash = await getChainDetails(walletAddress.chain).provider.send("eth_sendUserOperation", [
        userOp,
        getChainDetails(walletAddress.chain).EP_ADDRESS,
    ]);

    return {
        message: `Batch transaction sent successfully`,
        userOpHash: opTxHash
    };
}

export async function addUserWalletCosigner(req: Request, body: AddUserWalletCosignerValidationSchema) {
    const { wallet_address, cosigner_address, signatures } = body;
    if (!isValidEVMAddress(cosigner_address)) throw new BadRequestError("cosigner_address is not a valid evm address")
    const walletAddress = await walletModel.findOne({ user: AuthUser(req).id, address: wallet_address });
    if (!walletAddress) throw new BadRequestError("You do not own this address");

    const adminSigner = getAdminSigner(walletAddress.chain)
    const WalletAccountContract = new Contract(walletAddress.address, ACCOUNT_ABI, adminSigner);
    const adminAddress = await adminSigner.getAddress();
    const code = await getChainDetails(walletAddress.chain).provider.getCode(walletAddress.address);
    if (code == "0x") throw new BadRequestError("Make at least one transaction before adding signers");
    const signers = await WalletAccountContract.getSigners();
    validateAddSignerAddressesAndSignature(signers, signatures, adminAddress)
    const nonce = await WalletAccountContract.signersNonce();
    const msgHash = solidityPackedKeccak256(
        ['address', 'uint256'],
        [cosigner_address.toLowerCase(), nonce]
    )
    const adminSignature = await adminSigner.signMessage(getBytes(msgHash))
    const cosignerSignatures = signatures === undefined ? "" : signatures.slice(2)
    const completeSignatures = adminSignature + cosignerSignatures;
    try {
        const tnx = await WalletAccountContract.addSigner(cosigner_address, completeSignatures);
        await tnx.wait();
    } catch (error: any) {
        if (error.message && error.message.includes("New owner already exists")) {
            throw new BadRequestError("Co-signer already exist");
        } else {
            throw new BadRequestError("Invalid signatures");
        }
    }
    return {
        message: "Co-signer added successfully"
    }
}

export async function deleteUserWalletCosigner(req: Request, body: DeleteUserWalletCosignerValidationSchema) {
    const { wallet_address, cosigner_address, signatures } = body;
    if (!isValidEVMAddress(cosigner_address)) throw new BadRequestError("cosigner_address is not a valid evm address")
    const walletAddress = await walletModel.findOne({ user: AuthUser(req).id, address: wallet_address });
    if (!walletAddress) throw new BadRequestError("You do not own this address");

    const adminSigner = getAdminSigner(walletAddress.chain)
    const WalletAccountContract = new Contract(walletAddress.address, ACCOUNT_ABI, adminSigner);
    const adminAddress = await adminSigner.getAddress();
    const code = await getChainDetails(walletAddress.chain).provider.getCode(walletAddress.address);
    if (code == "0x") throw new BadRequestError("Make at least one transaction before adding signers");
    const signers = await WalletAccountContract.getSigners();
    validateDeleteSignerAddressesAndSignature(signers, signatures, adminAddress)
    const nonce = await WalletAccountContract.signersNonce();
    const msgHash = solidityPackedKeccak256(
        ['address', 'uint256'],
        [cosigner_address.toLowerCase(), nonce]
    )
    const adminSignature = await adminSigner.signMessage(getBytes(msgHash))
    const completeSignatures = adminSignature + signatures.slice(2);
    try {
        const tnx = await WalletAccountContract.deleteSigner(cosigner_address, completeSignatures);
        await tnx.wait();
    } catch (error: any) {
        throw new BadRequestError("Invalid signatures");
    }
    return {
        message: "Co-signer removed successfully"
    }
}

export async function createDynamicWallet(req: Request, body: CreateDynamicWalletValidationSchema) {
    const { chain, type, reference_code, user, amount, expires } = body;
    const getUser = await userModel.findById(user);
    if (!getUser) throw new BadRequestError("Invalid user/recipient");
    // const checkIfWalletExist = await dynamicWalletModel.findOne({ reference_code, chain, type });
    // if (checkIfWalletExist) return { address: checkIfWalletExist.address, salt: checkIfWalletExist.salt }
    const rand_str = generateRandomString(20);
    console.log("rand_str", rand_str)
    const userDataHash = hashData({
        reference_code,
        user,
        chain,
        type,
        amount,
        rand_str
    })
    const { address, salt } = await createWallet(chain, userDataHash);
    const { token_address, token_name } = getTokenDetailsByWalletType(type);
    await dynamicWalletModel.create({
        address,
        salt,
        reference_code: reference_code,
        user: user,
        chain,
        type,
        token_name,
        token_address,
        rand_str,
        amount,
        expiresAt: expires !== undefined ? addSecondsToDate(parseInt(expires) * 60) : null
    });
    return { address, salt };
}

export async function settleDynamicWallet(req: Request, body: SettleDynamicWalletValidationSchema) {
    const { wallet_address } = body;
    if (!isValidEVMAddress(wallet_address)) throw new BadRequestError("wallet_address is not a valid evm address")
    const walletAddress = await dynamicWalletModel.findOne({ address: wallet_address });
    if (!walletAddress) throw new BadRequestError("Invalid wallet address");
    if (walletAddress.expiresAt && (new Date(walletAddress.expiresAt)).getTime() <= (new Date).getTime()) throw new BadRequestError("Wallet is expired");
    const userWalletAddress = await walletModel.findOne({ user: walletAddress.user, token_name: walletAddress.token_name, token_address: walletAddress.token_address });
    if (!userWalletAddress) throw new BadRequestError("Invalid user wallet address");

    const adminSigner = getAdminSigner(walletAddress.chain)
    const entryPoint = new Contract(getChainDetails(walletAddress.chain).EP_ADDRESS, ENTRYPOINT_ABI, adminSigner);
    const AccountFactory = new ContractFactory(ACCOUNT_FACTORY_ARTIFACT.abi, ACCOUNT_FACTORY_ARTIFACT.bytecode);
    const WalletAccountContract = new Contract(walletAddress.address, ACCOUNT_ABI, adminSigner);
    const Account = new ContractFactory(ACCOUNT.abi, ACCOUNT.bytecode);
    const ERC20_CONTRACT = new Contract(walletAddress.token_address, ERC20_ABI, adminSigner);
    const adminAddress = await adminSigner.getAddress();

    const getBalanceDynamicWalletBalance = await ERC20_CONTRACT.balanceOf(walletAddress.address);
    const dynamicWalletBal = parseInt((getBalanceDynamicWalletBalance).toString());
    console.log(dynamicWalletBal);

    if (dynamicWalletBal === 0) {
        return {
            message: "Zero balance",
            date: []
        }
    }

    if (dynamicWalletBal > 0 && dynamicWalletBal < parseInt((parseEther(walletAddress.amount)).toString())) {
        await walletAddress.updateOne({
            expiresAt: Date.now()
        })
        return {
            message: "Wallet status changed to expired. Amount underpaid",
            date: []
        }
    }

    let initCode =
        getChainDetails(walletAddress.chain).AF_ADDRESS +
        AccountFactory.interface
            .encodeFunctionData("createAccount", [adminAddress, walletAddress.salt, getChainDetails(walletAddress.chain).EP_ADDRESS])
            .slice(2);

    let signers = [];
    const code = await getChainDetails(walletAddress.chain).provider.getCode(walletAddress.address);
    if (code !== "0x") {
        initCode = "0x";
        signers = await WalletAccountContract.getSigners();
    }

    const tokenDecimals = await ERC20_CONTRACT.decimals();
    console.log(tokenDecimals);
    const tokenContract = new Contract(walletAddress.token_address, ERC20_ABI);
    

    const userShare = dynamicWalletBal * ((100 - DYNAMIC_WALLET_SERVICE_CHARGE_PERCENTAGE) / 100);
    const userTnxData = tokenContract.interface.encodeFunctionData("transfer", [userWalletAddress.address, parseUnits(`${userShare}`, tokenDecimals)]);

    const adminShare = dynamicWalletBal - userShare;
    const adminTnxData = tokenContract.interface.encodeFunctionData("transfer", [adminAddress, parseUnits(`${adminShare}`, tokenDecimals)]);

    const adminUserOp: Partial<UserOperationStruct> = {
        sender: walletAddress.address, // smart account address
        nonce: "0x" + (await entryPoint.getNonce(walletAddress.address, 0)).toString(16),
        initCode,
        callData: Account.interface.encodeFunctionData("execute", [walletAddress.token_address, 0, adminTnxData]),
        paymasterAndData: getChainDetails(walletAddress.chain).PM_ADDRESS,
        signature: getDummySignatureByTotalSignersLength(signers.length > 0 ? signers.length : 1),
    };

    const userOp: Partial<UserOperationStruct> = {
        sender: walletAddress.address, // smart account address
        nonce: "0x" + (await entryPoint.getNonce(walletAddress.address, 0)).toString(16),
        initCode,
        callData: Account.interface.encodeFunctionData("execute", [walletAddress.token_address, 0, userTnxData]),
        paymasterAndData: getChainDetails(walletAddress.chain).PM_ADDRESS,
        signature: getDummySignatureByTotalSignersLength(signers.length > 0 ? signers.length : 1),
    };

    const { preVerificationGas, verificationGasLimit, callGasLimit } =
        await getChainDetails(walletAddress.chain).provider.send("eth_estimateUserOperationGas", [
            userOp,
            getChainDetails(walletAddress.chain).EP_ADDRESS,
        ]);

    console.log("preVerificationGas", parseInt(preVerificationGas))
    console.log("verificationGasLimit", parseInt(verificationGasLimit))
    console.log("callGasLimit", parseInt(callGasLimit))

    // update userOp with relevant gas info 
    userOp.preVerificationGas = preVerificationGas;
    userOp.verificationGasLimit = verificationGasLimit;
    userOp.callGasLimit = callGasLimit;
    adminUserOp.preVerificationGas = preVerificationGas;
    adminUserOp.verificationGasLimit = verificationGasLimit;
    adminUserOp.callGasLimit = callGasLimit;

    // get more relevant gas info and update userOp
    const { maxFeePerGas } = await getChainDetails(walletAddress.chain).provider.getFeeData();
    const maxPriorityFeePerGas = await getChainDetails(walletAddress.chain).provider.send(
        "rundler_maxPriorityFeePerGas",
        []
    );
    console.log("maxFeePerGas", parseInt(maxFeePerGas!.toString()))
    console.log("maxPriorityFeePerGas", parseInt(maxPriorityFeePerGas))

    userOp.maxFeePerGas = "0x" + maxFeePerGas!.toString(16);
    userOp.maxPriorityFeePerGas = maxPriorityFeePerGas;
    adminUserOp.maxFeePerGas = "0x" + maxFeePerGas!.toString(16);
    adminUserOp.maxPriorityFeePerGas = maxPriorityFeePerGas;

    // Sign userOp hash with account signer
    const userOpHash = await entryPoint.getUserOpHash(userOp as UserOperationStruct);
    const adminSignatureForUser = await adminSigner.signMessage(getBytes(userOpHash))
    const adminSignatureForAdmin = await adminSigner.signMessage(getBytes(userOpHash))

    userOp.signature = adminSignatureForUser;
    adminUserOp.signature = adminSignatureForAdmin;

    // execute transaction
    const opTxHash = await Promise.all([
        getChainDetails(walletAddress.chain).provider.send("eth_sendUserOperation", [
            userOp,
            getChainDetails(walletAddress.chain).EP_ADDRESS,
        ]),
        getChainDetails(walletAddress.chain).provider.send("eth_sendUserOperation", [
            adminUserOp,
            getChainDetails(walletAddress.chain).EP_ADDRESS,
        ])
    ])

    await walletAddress.updateOne({
        expiresAt: Date.now()
    })

    return {
        message: `Transaction Settled successfully`,
        data: opTxHash
    };
}

async function createWallet(chain: string, walletHashData: string): Promise<{ address: string, salt: string }> {
    const adminSigner = getAdminSigner(chain)
    const entryPoint = new Contract(getChainDetails(chain).EP_ADDRESS, ENTRYPOINT_ABI, adminSigner);
    const AccountFactory = new ContractFactory(ACCOUNT_FACTORY_ARTIFACT.abi, ACCOUNT_FACTORY_ARTIFACT.bytecode);
    const adminAddress = await adminSigner.getAddress();
    const salt = padHexString(walletHashData);
    // console.log('user account salt', salt)
    let initCode =
        getChainDetails(chain).AF_ADDRESS +
        AccountFactory.interface
            .encodeFunctionData("createAccount", [adminAddress, salt, getChainDetails(chain).EP_ADDRESS])
            .slice(2);
    let address = "";
    try {
        await entryPoint.getSenderAddress(initCode);
    } catch (ex: any) {
        address = "0x" + ex.data.slice(-40);
    }
    if (address === "") throw new BadRequestError("Error occured while creating address");
    return { address, salt };
}

function validateAddSignerAddressesAndSignature(addresses: string[], signatures: string | undefined, adminAddress: string): void {
    // Check if the array of addresses is empty
    if (addresses.length === 0) {
        throw new Error("Invalid address: there are no active signers");
    }
    // Check if admin address is in the array
    const isAdminPresent = addresses.some(address => address.toLowerCase() === adminAddress.toLowerCase());
    // If admin address is present, ensure it's the only address when signatures is empty
    if (isAdminPresent) {
        if (addresses.length > 1 && signatures === undefined) {
            throw new Error("there are co-signers attached to this wallet. Signatures is required");
        }
    } else {
        // If admin address is not present, signatures must be provided
        if (signatures === undefined) {
            throw new Error("Signatures is required for non-custodial wallets");
        }
    }
}

function validateDeleteSignerAddressesAndSignature(addresses: string[], address: string, adminAddress: string): void {
    // Check if the array of addresses is empty
    if (addresses.length === 0) {
        throw new Error("Invalid address: there are no active signers");
    }
    if (address.toLowerCase() === adminAddress.toLowerCase()) {
        throw new Error("You can no delete this signer");
    }
    // Check if admin address is in the array
    const isAdminPresent = addresses.some(address => address.toLowerCase() === adminAddress.toLowerCase());

    if (isAdminPresent && addresses.length === 1) {
        throw new Error("This address is fully managed by moipayway.");
    }
}