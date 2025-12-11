import type { Request, Response, NextFunction } from "express";
import { CustomError } from "../errors/custom-error";
// import { RequestValidationError } from "../errors/request-validation";
// import { DatabaseConnectionError } from "../errors/database-connection";

export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
    //? General Error handling regardless of the Error Subclass
    if (error instanceof CustomError) {
        return res.status(error.statusCode).json({ errors: error.serializeErrors() });
    }

    /*
        if (error instanceof RequestValidationError) {
            return res.status(error.statusCode).json({ errors: error.serializeErrors() });
        }

        if(error instanceof DatabaseConnectionError) {
            res.status(error.statusCode).json({ errors: error.serializeErrors() })
            return
        } 
    */

    // if the error has now specific type, then just throw a generic error
    return res.status(500).json({ errors: [{
        message: "Internal Server Error"
    }] })
}