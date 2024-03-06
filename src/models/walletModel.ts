import { model } from "mongoose";
import walletSchema from "./schemas/walletSchema";
import { IWallet } from "../types/model.types";

export default model<IWallet>("wallet", walletSchema)