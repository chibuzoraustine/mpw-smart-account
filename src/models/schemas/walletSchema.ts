
import { Schema } from "mongoose";
import { requiredString } from "../../utils/requiredSchemaType";
import { IWallet } from "../../types/model.types";

export default new Schema<IWallet>({
    salt: { ...requiredString },
    chain: { ...requiredString },
    type: { ...requiredString },
    address: { ...requiredString },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    createdAt: {
        type: Date,
        immutable: true,
        default: () => Date.now()
    },
    updatedAt: {
        type: Date,
        default: () => Date.now()
    },
})