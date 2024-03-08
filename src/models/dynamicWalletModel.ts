import { model } from "mongoose";
import dynamicWalletSchema from "./schemas/dynamicWalletSchema";
import { IDynamicWallet } from "../types/model.types";

export default model<IDynamicWallet>("dynamic_wallet", dynamicWalletSchema)