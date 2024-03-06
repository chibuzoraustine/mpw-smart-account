import { Request } from "express";
import AuthUser from "../utils/authUser";
import walletModel from "../models/walletModel";
import { BadRequestError } from "../utils/errors";

export async function getWallets(req: Request) {
    const resp = await walletModel.find({user: AuthUser(req).id}).select('salt chain type address');
    return resp;
}

export async function createWallet(req: Request) {
    const { chain, type } = req.body;
    const checkIfWalletExist = await walletModel.findOne({user: AuthUser(req).id, chain: chain, type: type});
    if (checkIfWalletExist) throw new BadRequestError("Wallet already exist for this chain and type");
    // return resp;
}

