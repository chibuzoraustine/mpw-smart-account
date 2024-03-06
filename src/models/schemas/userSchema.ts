
import { Schema } from "mongoose";
import { requiredString } from "../../utils/requiredSchemaType";
import { IUser } from "../../types/model.types";

export default new Schema<IUser>({
    firstname: { ...requiredString },
    lastname: { ...requiredString },
    middlename: {
        type: String,
        default: () => null
    },
    email: {
        ...requiredString,
        // unique: [true, "email already exists in database!"],
        lowercase: true
    },
    wallets: [{
        type: Schema.Types.ObjectId,
        ref: 'wallet'
    }],
    password: { ...requiredString },
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