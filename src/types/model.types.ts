
export interface IUser {
    firstname: string;
    lastname: string;
    middlename?: string;
    password: string;
    email: string;
    wallets?: IWallet[];
    createdAt?: string;
    updatedAt?: string;
}

export interface IWallet {
    salt: string;
    chain: string;
    type: string;
    token_name: string;
    token_address: string;
    address: string;
    user?: IUser;
    createdAt?: string;
    updatedAt?: string;
}

export interface IDynamicWallet {
    salt: string;
    reference_code: string;
    chain: string;
    type: string;
    token_name: string;
    token_address: string;
    address: string;
    user?: IUser;
    amount: string;
    rand_str: string;
    expiresAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface IAccessToken {
    user: IUser; 
    token: string;
    expiresAt?: string;
}