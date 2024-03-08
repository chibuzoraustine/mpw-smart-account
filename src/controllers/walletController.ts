import { Request, Response } from "express"
import { ValidationError, handleResponseError } from "../utils/errors";
import * as walletServices from "../services/walletServices"
import * as walletValidations from "../validations/wallet"

export async function getWallets(req: Request, res: Response) {
    try {
        const resp = await walletServices.getUserWallets(req);
        return res.json(resp);
    } catch (error) {
        return handleResponseError(res, error)
    }
}

export async function createUserWallet(req: Request, res: Response) {
    try {
        const {error, value} = walletValidations.userWalletCreate(req.body) ;
        if (error) throw new ValidationError(undefined, error.details);
        const resp = await walletServices.createUserWallet(req, value);
        return res.json(resp);
    } catch (error) {
        return handleResponseError(res, error)
    }
}

export async function walletTransfer(req: Request, res: Response) {
    try {
        const {error, value} = walletValidations.walletTransfer(req.body) ;
        if (error) throw new ValidationError(undefined, error.details);
        const resp = await walletServices.walletTransfer(req, value);
        return res.json(resp);
    } catch (error) {
        return handleResponseError(res, error)
    }
}

export async function walletTransferBatch(req: Request, res: Response) {
    try {
        const {error, value} = walletValidations.walletTransferBatch(req.body) ;
        if (error) throw new ValidationError(undefined, error.details);
        const resp = await walletServices.walletTransferBatch(req, value);
        return res.json(resp);
    } catch (error) {
        return handleResponseError(res, error)
    }
}

export async function addUserWalletCosigner(req: Request, res: Response) {
    try {
        const {error, value} = walletValidations.addUserWalletCosigner(req.body) ;
        if (error) throw new ValidationError(undefined, error.details);
        const resp = await walletServices.addUserWalletCosigner(req, value);
        return res.json(resp);
    } catch (error) {
        return handleResponseError(res, error)
    }
}

export async function deleteUserWalletCosigner(req: Request, res: Response) {
    try {
        const {error, value} = walletValidations.deleteUserWalletCosigner(req.body) ;
        if (error) throw new ValidationError(undefined, error.details);
        const resp = await walletServices.deleteUserWalletCosigner(req, value);
        return res.json(resp);
    } catch (error) {
        return handleResponseError(res, error)
    }
}

export async function createDynamicWallet(req: Request, res: Response) {
    try {
        const {error, value} = walletValidations.dynamicWalletCreate(req.body) ;
        if (error) throw new ValidationError(undefined, error.details);
        const resp = await walletServices.createDynamicWallet(req, value);
        return res.json(resp);
    } catch (error) {
        return handleResponseError(res, error)
    }
}

export async function settleDynamicWallet(req: Request, res: Response) {
    try {
        const {error, value} = walletValidations.settleDynamicWallet(req.body) ;
        if (error) throw new ValidationError(undefined, error.details);
        const resp = await walletServices.settleDynamicWallet(req, value);
        return res.json(resp);
    } catch (error) {
        return handleResponseError(res, error)
    }
}
