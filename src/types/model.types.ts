
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
    address: string;
    user?: IUser;
    createdAt?: string;
    updatedAt?: string;
}

export interface IAccessToken {
    user: IUser; 
    token: string;
    expiresAt?: string;
}