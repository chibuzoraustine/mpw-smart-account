
import { Schema } from "mongoose";
import { requiredString } from "../../utils/requiredSchemaType";
import { IAccessToken } from "../../types/model.types";

export default new Schema<IAccessToken>({
    token: { ...requiredString },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    expiresAt: {
        type: Date,
        // default: () => Date.now() 
    },
})