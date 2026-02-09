import { CustomError } from "./custom-error";

// Custom error class for handling internal server errors
export class InternalServerError extends CustomError  {
    statusCode = 500;
    reason: string;

    // The constructor runs every time we create a new InternalServerError.
    constructor(message?: string) {
        // Call the parent (Error) constructor. (Like a chain effect)
        // This sets up the built-in Error features (stack trace, message, etc.).
        super(message || "Internal Server Error");
        this.reason = message || "Internal Server Error";

        // Fix the prototype chain because we're extending a built-in class (Error).
        // Without this, "instanceof InternalServerError" might not work correctly,
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
