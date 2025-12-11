import { CustomError } from "./custom-error";

// Custom error class for handling validation errors in requests
export class RequestConflictError extends CustomError {
    statusCode = 409;

    // The constructor runs every time we create a new NotFoundError.
    // It accepts an array of ValidationError objects from express-validator.
    // Using "private errors: ValidationError[]" both:
    //   1. Declares a class property called "errors" 
    //   2. Automatically assigns the constructor argument to that property
    constructor(public message: string) {
        // Call the parent (Error) constructor. (Like a chain effect)
        // This sets up the built-in Error features (stack trace, message, etc.).
        // You could pass a message here like: super("Invalid request parameters");
        super("Resource is already in use");

        // Fix the prototype chain because we're extending a built-in class (Error).
        // Without this, "instanceof NotFoundError" might not work correctly,
        // since JavaScript has quirks when subclassing built-ins.
        Object.setPrototypeOf(this, RequestConflictError.prototype);
    }

    serializeErrors() {
        return [
            { message: this.message }
        ]
    }
}
