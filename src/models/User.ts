import toJSON from "../utils/json";
import { Password } from "../utils/password"
import mongoose, { Schema, Document, Model } from "mongoose";

// Document interface = what exists after saving in Mongo
// An interface that describes the properties that a User Document has
export interface UserInterface extends Document {
    // Base user info
    name: string;
    surname: string; 
    email: string;
    password: string; 
    confirmed: boolean; 
    admin: boolean; 

    createdAt: string; 
    updatedAt: string; 
}

// Attributes interface = what you must provide to create a user
export interface UserAttrs {
    name: string; 
    surname: string; 
    email: string; 
    password: string;
}

// Model interface = adds a build method that uses UserAttrs
// An interface that describes the properties that are required to create a new User
export interface UserModel extends Model<UserInterface> {
    build(attrs: UserAttrs): UserInterface;
}

// Define the User document Schema
const userSchema : Schema = new Schema(
    {
        name: {
            type: String, 
            required: true, 
            trim: true, 
        }, 
        surname: {
            type: String, 
            required: true, 
            trim: true
        }, 
        email: {
            type: String, 
            required: true, 
            trim: true
        }, 
        password: {
            type: String, 
            required: true, 
            trim: true
        }, 
        confirmed: {
            type: Boolean, 
            required: true, 
            default: false,
        }, 
        admin: {
            type: Boolean, 
            required: true, 
            default: false, 
    }, 
    {
        timestamps: true,
        // toJSON: {
        //     transform(doc, ret) {
        //         (ret as any).id = ret._id;
        //         delete ret._id;
        //         delete ret.password;
        //         delete ret.__v;
        //     },
        // },
    }
);

// Use the toJSON function from json.ts file
toJSON(userSchema, "password");

// Hashing Passwords by using the .pre middleware function implemented in mongoose
// Any time an attempt to save a document to the db is made, the following code will execute
userSchema.pre("save", async function(done) {
    // Only hash the password if the password field has been modified
    if(this.isModified("password")) {
        const hashed = await Password.hashPassword(this.get("password") as string);
        this.set("password", hashed);
    }

    done();
})

// Add  custom static "build" method
userSchema.statics.build = (attrs: UserAttrs) => {
    return new User(attrs);
}

// Now when we call the User constructor it already has typescript validation
const User = mongoose.model<UserInterface, UserModel>('User', userSchema)

export default User
