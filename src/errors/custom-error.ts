interface Serialize {
    message: string;
    field?: string;
}

export abstract class CustomError extends Error {
    abstract statusCode: number; 

    constructor(message: string) {
        // Calling super() is equivalent to calling throw new Error("...")
        super(message);

        Object.setPrototypeOf(this, CustomError.prototype);
    }

    abstract serializeErrors() : Serialize[]
}