import mongoose, { Schema } from "mongoose";

// Map virtual USER model attributes to return in responses
export default function toJSON(model: Schema, ...fields: string[]) {
	model.set("toJSON", {
		transform: (document, returnedObject) => {
			returnedObject.id = returnedObject._id.toString();
			delete returnedObject._id;
			delete returnedObject.__v;
			// delete returnedObject.createdAt;
			// delete returnedObject.updatedAt;

			fields.forEach((field) => delete returnedObject[field]);
		},
	});
}

// When .lean() is used...
export function formatLean<T>(value: T): T {
    // Arrays
    if (Array.isArray(value)) {
        return value.map(formatLean) as T;
    }

    // Dates → keep intact
    if (value instanceof Date) {
        return value;
    }

    // ObjectId → string
    if (value instanceof mongoose.Types.ObjectId) {
        return value.toString() as T;
    }

    // Plain objects only
    if (value && typeof value === "object") {
        const obj = value as Record<string, any>;
        const { _id, __v, ...rest } = obj;

        const formatted: Record<string, any> = {};

        if (_id !== undefined) {
            formatted.id =
                _id instanceof mongoose.Types.ObjectId
                    ? _id.toString()
                    : _id;
        }

        for (const key in rest) {
            formatted[key] = formatLean(rest[key]);
        }

        return formatted as T;
    }

    return value;
}
