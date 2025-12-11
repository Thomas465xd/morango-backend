import { CustomError } from "./custom-error";

// Custom error class for handling DB connection errors
export class DatabaseConnectionError extends CustomError  {
    statusCode = 503;
    reason = "Error Connecting to the Database";

    // The constructor runs every time we create a new DatabaseConnectionError.
    constructor() {
        // Call the parent (Error) constructor. (Like a chain effect)
        // This sets up the built-in Error features (stack trace, message, etc.).
        // You could pass a message here like: super("Invalid request parameters");
        super("Error Connecting to the Database");

        // Fix the prototype chain because we're extending a built-in class (Error).
        // Without this, "instanceof RequestValidationError" might not work correctly,
        // since JavaScript has quirks when subclassing built-ins.
        Object.setPrototypeOf(this, DatabaseConnectionError.prototype);
    }

    serializeErrors() {
        return [
            { 
                message: this.reason
            }
        ]
    }
}
