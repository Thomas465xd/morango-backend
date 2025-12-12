import type { Request, Response, NextFunction } from "express";
import { CustomError } from "../errors/custom-error";

export const errorHandler = (
    error: Error, 
    req: Request, 
    res: Response, 
    next: NextFunction
): void => {
    //? General Error handling regardless of the Error Subclass
    if (error instanceof CustomError) {
        res.status(error.statusCode).json({ errors: error.serializeErrors() });
        return;
    }

    // if the error has no specific type, then just throw a generic error
    res.status(500).json({ 
        errors: [{ message: "Internal Server Error" }] 
    });
}