import { model } from "mongoose";
import accessTokenSchema from "./schemas/accessTokenSchema";
import { IAccessToken } from "../types/model.types";

export default model<IAccessToken>("access_token", accessTokenSchema)