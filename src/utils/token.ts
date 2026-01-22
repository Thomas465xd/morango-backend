import crypto from "crypto"; 

export const createToken = () => {
    return crypto.randomUUID(); 
}