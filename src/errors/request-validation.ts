import { ValidationError } from "express-validator";
import { CustomError } from "./custom-error";

// Custom error class for handling validation errors in requests
export class RequestValidationError extends CustomError {
    statusCode = 400;

    // The constructor runs every time we create a new RequestValidationError.
    // It accepts an array of ValidationError objects from express-validator.
    // Using "private errors: ValidationError[]" both:
    //   1. Declares a class property called "errors" 
    //   2. Automatically assigns the constructor argument to that property
    constructor(public errors: ValidationError[]) {
        // Call the parent (Error) constructor. (Like a chain effect)
        // This sets up the built-in Error features (stack trace, message, etc.).
        // You could pass a message here like: super("Invalid request parameters");
        super("Invalid Request Parameters");

        // Fix the prototype chain because we're extending a built-in class (Error).
        // Without this, "instanceof RequestValidationError" might not work correctly,
        // since JavaScript has quirks when subclassing built-ins.
        Object.setPrototypeOf(this, RequestValidationError.prototype);
    }

    serializeErrors() {
        return this.errors.map((error) => {
            if (error.type === 'field') {
                return { message: error.msg, field: error.path };
            }
        });
    }
}
