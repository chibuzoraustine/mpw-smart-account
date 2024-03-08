
import { Schema } from "mongoose";
import { requiredString } from "../../utils/requiredSchemaType";
import { IDynamicWallet } from "../../types/model.types";

export default new Schema<IDynamicWallet>({
    salt: { ...requiredString },
    reference_code: { ...requiredString },
    chain: { ...requiredString },
    type: { ...requiredString },
    token_name: { ...requiredString },
    token_address: { ...requiredString },
    address: { ...requiredString },
    amount: { ...requiredString },
    rand_str: { ...requiredString },
    expiresAt: {
        type: Date,
        default: null
    },
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