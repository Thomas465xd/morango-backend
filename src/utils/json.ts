import { Schema, Document } from "mongoose";

// Map virtual USER model attributes to return in responses
export default function toJSON(model: Schema, ...fields: string[]) {
	model.set("toJSON", {
		transform: (document, returnedObject) => {
			returnedObject.id = returnedObject._id.toString();
			delete returnedObject._id;
			delete returnedObject.__v;
			delete returnedObject.createdAt;
			delete returnedObject.updatedAt;

			fields.forEach((field) => delete returnedObject[field]);
		},
	});
}
