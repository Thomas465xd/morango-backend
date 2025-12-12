import { hashPassword } from "../utils/auth";
import toJSON from "../utils/json";
import mongoose, { Schema, Document, Model } from "mongoose";

// Document interface = what exists after saving in Mongo
// An interface that describes the properties that a User Document has

export enum Roles {
    Customer = "customer", 
    Admin = "admin"
}

export enum Regions {
    "Arica y Parinacota",
    "Tarapacá",
    "Antofagasta",
    "Atacama",
    "Coquimbo",
    "Valparaíso",
    "Metropolitana de Santiago",
    "O'Higgins",
    "Maule",
    "Ñuble",
    "Biobío",
    "La Araucanía",
    "Los Ríos",
    "Los Lagos",
    "Aysén",
    "Magallanes"
}

interface Address {
    country: string // e.g. Chile
    region: Regions // e.g. Metropolitana de Santiago
    city: string // e.g. Puerto Varas
    cityArea: string // e.g. Providencia
    street: string // e.g. San Carlos de Apoquindo 1203
    reference: string // e.g. 106 Torre A
    zipCode: string 
}

export interface UserInterface extends Document {
    // Base user info
    name: string;
    surname: string; 
    email: string;
    phone: string; 
    password: string; 

    confirmed: boolean; 
    role: Roles; 

    address: Address; 

    createdAt: string; 
    updatedAt: string; 
}

// Attributes interface = what you must provide to create a user
// Shipping info can be set later
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
            lowercase: true,
            trim: true
        }, 
        phone: {
            type: String, 
            required: false, 
            trim: true, 
        },
        //! CAN BE NULL UNTIL THE USERS SETS IT
        password: {
            type: String, 
            required: false,
            default: null,  
            trim: true
        }, 
        confirmed: {
            type: Boolean, 
            required: true, 
            default: false,
        }, 
        role: {
            type: String, 
            required: true, 
            enum: Roles,
            default: Roles.Customer, 
        }, 
        address: {
            country: {
                type: String, 
                required: false, 
                trim: true, 
                default: "Chile"
            },
            region: {
                type: String, 
                required: false, 
                enum: Object.values(Regions)
            },
            city: {
                type: String, 
                required: false, 
                trim: true, 
            }, 
            cityArea: {
                type: String, 
                required: false, 
                trim: true, 
            },
            street: {
                type: String, 
                required: false, 
                trim: true, 
            }, 
            reference: {
                type: String, 
                requried: false, 
                trim: true
            }, 
            zipCode: {
                type: String, 
                required: false, 
                trim: true, 
            }
        }
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

//? Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });

// Hashing Passwords by using the .pre middleware function implemented in mongoose
// Any time an attempt to save a document to the db is made, the following code will execute
userSchema.pre("save", async function(done) {
    // Only hash the password if the password field has been modified
    if(this.isModified("password")) {
        const hashed = await hashPassword(this.get("password") as string);
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
