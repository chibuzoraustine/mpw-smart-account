import { Request, Response } from "express"
import { handleResponseError } from "../utils/errors";
import * as userServices from "../services/userServices"

export async function getUser(req: Request, res: Response) {
    try {
        const resp = await userServices.getUserBio(req);
        return res.json(resp);
    } catch (error) {
        return handleResponseError(res, error)
    }
}