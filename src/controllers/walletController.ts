import { Request, Response } from "express"
import { handleResponseError } from "../utils/errors";
import * as walletServices from "../services/walletServices"

export async function getWallets(req: Request, res: Response) {
    try {
        const resp = await walletServices.getWallets(req);
        return res.json(resp);
    } catch (error) {
        return handleResponseError(res, error)
    }
}

export async function createWallet(req: Request, res: Response) {
    try {
        const resp = await walletServices.createWallet(req);
        return res.json(resp);
    } catch (error) {
        return handleResponseError(res, error)
    }
}

