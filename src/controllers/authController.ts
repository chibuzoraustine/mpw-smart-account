
import userModel from "../models/userModel"
import bcrypt from "bcrypt"
import { Request, Response } from "express"
import jsonwebtoken from "jsonwebtoken"
import { BadRequestError, handleResponseError } from "../utils/errors"
import accessTokenModel from "../models/accessTokenModel"

export const register = async (req: Request, res: Response) => {

    try {
        const checkEmailExist = await userModel.exists({ email: req.body.email })
        if (checkEmailExist) throw new BadRequestError("Email already exists");

        const hashPass = await bcrypt.hash(req.body.password, 10)
        const user = await userModel.create({
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            password: hashPass
        })

        const jwtToken = jsonwebtoken.sign({ id: user._id, email: user.email }, process.env.APP_SECRET!)

        // @dev Calculate the expiration time for the token
        const _currentDateTime = new Date(); // Get the current date and time
        const _expirationTime = new Date(_currentDateTime.getTime() + 4 * 60 * 60 * 1000);

        await accessTokenModel.create({
            token: jwtToken,
            user: user?._id,
            expiresAt: _expirationTime
        })

        res.json({
            user: {
                id: user?._id,
                email: user?.email
            },
            token: jwtToken
        })

    } catch (error) {
        return handleResponseError(res, error)
    }
}

export const login = async (req: Request, res: Response) => {
    try {

        const { email, password } = req.body

        const checkEmailExist = await userModel.exists({ email })
        if (!checkEmailExist) throw new BadRequestError("Invalid login credentials" );

        const _user = await userModel.findOne({ email: email })

        const checkPassword = await bcrypt.compare(password, _user!.password)
        if (!checkPassword) throw new BadRequestError("Invalid login credentials" );

        const jwtToken = jsonwebtoken.sign({ id: _user!._id, email: _user!.email }, process.env.APP_SECRET!)
        
        // @dev Calculate the expiration time for the token
        const _currentDateTime = new Date(); // Get the current date and time
        const _expirationTime = new Date(_currentDateTime.getTime() + 4 * 60 * 60 * 1000);

        await accessTokenModel.create({
            token: jwtToken,
            user: _user?._id,
            expiresAt: _expirationTime
        })

        res.json({
            user: {
                id: _user?._id,
                email: _user?.email
            },
            token: jwtToken
        })

    } catch (error) {
        return handleResponseError(res, error)
    }

}