import { NextFunction, Request, Response } from "express";
import passport from "./passport-auth";
import { BadRequestError, UnauthorizedError, handleResponseError } from "../utils/errors";
import { IAuthRequestUser } from "../types/global.types";
import accessTokenModel from "../models/accessTokenModel";

const only_auth_user = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('jwt', { session: false }, async (err: unknown, user: IAuthRequestUser) => {
        // validate passport user payload
        try {
            if (err) {
                throw new BadRequestError("An error occurred during authentication")
            }
            if (!user) {
                throw new UnauthorizedError()
            }
            // validate access token
            const bearerTokenFromRequestHeader = (req.headers.authorization || '').split(' ')[1];
            if (!bearerTokenFromRequestHeader) throw new UnauthorizedError()
            // retrieve access token
            // console.log(user)
            const accessToken = await accessTokenModel.findOne({ user: user.id, token: bearerTokenFromRequestHeader });
            if (!accessToken) throw new UnauthorizedError("invalid or expired access token");
            // calidate token expiry date
            const currentDate = new Date();
            const tokenExpirationDate = new Date(`${accessToken?.expiresAt}`);
            if (tokenExpirationDate.getTime() <= currentDate.getTime()) {
                await accessTokenModel.deleteOne({ _id: accessToken._id })
                throw new UnauthorizedError("invalid or expired access tokenss");
            }
            // check role
            // if (user.role !== ROLE.ADMIN) {
            //     throw new UnauthorizedError("Forbidden: Unauthorized")
            // }
            req.user = user;
        } catch (error) {
            return handleResponseError(res, error);
        }
        next();
    })(req, res, next);
}

export default only_auth_user;