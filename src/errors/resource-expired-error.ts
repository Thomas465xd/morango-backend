import { ValidationError } from "express-validator";
import { CustomError } from "./custom-error";

export class ResourceExpiredError extends CustomError {
    statusCode = 410;

    // The constructor runs every time we create a new ResourceExpiredError.
    // It accepts an array of ValidationError objects from express-validator.
    // Using "private errors: ValidationError[]" both:
    //   1. Declares a class property called "errors" 
    //   2. Automatically assigns the constructor argument to that property
    constructor(public message: string) {
        // Call the parent (Error) constructor. (Like a chain effect)
        // This sets up the built-in Error features (stack trace, message, etc.).
        // You could pass a message here like: super("Invalid request parameters");
        super("Request is no longer available");

        // Fix the prototype chain because we're extending a built-in class (Error).
        // Without this, "instanceof ResourceExpiredError" might not work correctly,
        // since JavaScript has quirks when subclassing built-ins.
        Object.setPrototypeOf(this, ResourceExpiredError.prototype);
    }

    serializeErrors() {
        return [
            { message: this.message }
        ]
    }
}
