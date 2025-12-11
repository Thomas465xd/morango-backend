import { CustomError } from "./custom-error";

// Custom error class for handling DB connection errors
export class InternalServerError extends CustomError  {
    statusCode = 500;
    reason = "Internal Server Error";

    // The constructor runs every time we create a new InternalServerError.
    constructor() {
        // Call the parent (Error) constructor. (Like a chain effect)
        // This sets up the built-in Error features (stack trace, message, etc.).
        // You could pass a message here like: super("Invalid request parameters");
        super("Internal Server Error");

        // Fix the prototype chain because we're extending a built-in class (Error).
        // Without this, "instanceof RequestValidationError" might not work correctly,
        // since JavaScript has quirks when subclassing built-ins.
        Object.setPrototypeOf(this, InternalServerError.prototype);
    }

    serializeErrors() {
        return [
            { 
                message: this.reason
            }
        ]
    }
}
