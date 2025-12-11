import type { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { RequestValidationError } from "../errors/request-validation";

export const handleInputErrors = (req: Request, res: Response, next: NextFunction): void => {
    //console.log(req.body);
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array())
    }

    next();
}
