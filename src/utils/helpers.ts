// import { RESULT_PER_PAGE } from "../v1/config.js";
import Joi from "joi"

export function ucfirst(str: string) {
    //convert first letter to uppercase
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function currencyFormat(data: number) {
    let formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        // These options are needed to round to whole numbers if that's what you want.
        //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
        //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
    });

    return formatter.format(data)
}

export function truncate(str: string, length = 25) {
    if (str.length < 1) return
    let truncatedString = str
    if (length > 10 && str.length > length ) {
        truncatedString = str.substring(0, length-3)+' ...'
    }
    return truncatedString
}

export function handlePaginate(_page:number, _resultPerPage = 10) {
    return {
        offset: (_page-1)*_resultPerPage,
        limit: _resultPerPage
    }
}

export function handleValidationErrors(error: Array<Joi.ValidationErrorItem>) {
    throw error;
}