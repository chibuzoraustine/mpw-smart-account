import Joi from "joi";
import {
    AddUserWalletCosignerValidationSchema,
    CreateDynamicWalletValidationSchema,
    CreateUserWalletValidationSchema,
    DeleteUserWalletCosignerValidationSchema,
    SettleDynamicWalletValidationSchema,
    WalletTransferBatchValidationSchema,
    WalletTransferValidationSchema
} from "../types/validation.types";

export const userWalletCreate = (data: CreateUserWalletValidationSchema) => {
    const dataSchema = Joi.object<CreateUserWalletValidationSchema>({
        chain: Joi.string().required(),
        type: Joi.string().required(),
    })

    return dataSchema.validate(data, { abortEarly: false })
}

export const walletTransfer = (data: WalletTransferValidationSchema) => {
    const dataSchema = Joi.object<WalletTransferValidationSchema>({
        wallet_address: Joi.string().required(),
        to_address: Joi.string().required(),
        amount: Joi.string().required(),
        signatures: Joi.string()
    })

    return dataSchema.validate(data, { abortEarly: false })
}

export const walletTransferBatch = (data: WalletTransferBatchValidationSchema) => {
    const dataSchema = Joi.object<WalletTransferBatchValidationSchema>({
        transactions: Joi.array().items(
            Joi.object({
                to_address: Joi.string().required(),
                amount: Joi.string().required()
            })
        ).required(),
        wallet_address: Joi.string().required(),
        signatures: Joi.string()
    })

    return dataSchema.validate(data, { abortEarly: false })
}

export const addUserWalletCosigner = (data: AddUserWalletCosignerValidationSchema) => {
    const dataSchema = Joi.object<AddUserWalletCosignerValidationSchema>({
        wallet_address: Joi.string().required(),
        cosigner_address: Joi.string().required(),
        signatures: Joi.string()
    })

    return dataSchema.validate(data, { abortEarly: false })
}

export const deleteUserWalletCosigner = (data: DeleteUserWalletCosignerValidationSchema) => {
    const dataSchema = Joi.object<DeleteUserWalletCosignerValidationSchema>({
        wallet_address: Joi.string().required(),
        cosigner_address: Joi.string().required(),
        signatures: Joi.string().required()
    })

    return dataSchema.validate(data, { abortEarly: false })
}

export const dynamicWalletCreate = (data: CreateDynamicWalletValidationSchema) => {
    const dataSchema = Joi.object<CreateDynamicWalletValidationSchema>({
        chain: Joi.string().required(),
        type: Joi.string().required(),
        reference_code: Joi.string().required(),
        user: Joi.string().required(),
        amount: Joi.string().required(),
        expires: Joi.string(),
    })

    return dataSchema.validate(data, { abortEarly: false })
}

export const settleDynamicWallet = (data: SettleDynamicWalletValidationSchema) => {
    const dataSchema = Joi.object<SettleDynamicWalletValidationSchema>({
        wallet_address: Joi.string().required()
    })

    return dataSchema.validate(data, { abortEarly: false })
}