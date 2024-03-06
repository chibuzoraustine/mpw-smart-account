import { Request } from "express";
import userModel from "../models/userModel";
import AuthUser from "../utils/authUser";

export async function getUserBio(req: Request) {
    const resp = await userModel.findOne({_id: AuthUser(req).id});
    return {
        id: resp?._id,
        firstname: resp?.firstname,
        lastname: resp?.lastname,
        email: resp?.email
    }
}