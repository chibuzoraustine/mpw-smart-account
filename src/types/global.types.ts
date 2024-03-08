import { BigNumberish } from "ethers";

export interface IResourceBuilder<T> {
    data: T | T[],
    meta_data?: {
        pagination?: {
            current_page: number;
            total_pages: number;
            result_per_page?: number;
            total_result: number;
        }
        readonly version: string;
        description?: string;
    }
}

export type IAuthRequestUser = {
    id: string,
    email: string
}

export interface CallData {
    to: string;
    value: BigNumberish;
    data: string;
}