import { Request } from "express";
import { UnauthorizedError } from "./errors";
import { IAuthRequestUser } from "../types/global.types";

export default function AuthUser(req: Request) {
    if (!("id" in req.user!)) throw new UnauthorizedError()
    return req.user as IAuthRequestUser;
}