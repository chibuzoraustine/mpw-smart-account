export interface CreateUserWalletValidationSchema {
    chain: string;
    type: string;
}

export interface CreateDynamicWalletValidationSchema extends CreateUserWalletValidationSchema {
    reference_code: string;
    user: string,
    amount: string,
    expires?: string
}

export interface WalletTransferValidationSchema {
    wallet_address: string;
    to_address: string;
    amount: string;
    signatures?: string
}

export interface WalletTransferBatchValidationSchema {
    wallet_address: string;
    transactions: {
        to_address: string;
        amount: string;
    }[];
    signatures?: string
}

export interface AddUserWalletCosignerValidationSchema {
    wallet_address: string,
    cosigner_address: string;
    signatures?: string
}

export interface DeleteUserWalletCosignerValidationSchema {
    wallet_address: string,
    cosigner_address: string;
    signatures: string
}

export interface SettleDynamicWalletValidationSchema {
    wallet_address: string;
}