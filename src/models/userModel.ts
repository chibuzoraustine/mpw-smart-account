import { model } from "mongoose";
import userSchema from "./schemas/userSchema";
import { IUser } from "../types/model.types";

export default model<IUser>("user", userSchema)