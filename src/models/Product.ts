import toJSON from "../utils/json";
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export enum ProductTypes {
    Ring = "Anillo", 
    Necklace = "Collar", 
    Bracelet = "Pulsera", 
    Earring = "Aros"
}

// TODO Write Product Attribute types
type RingAttributes = {
    size: string 
    material: string // gold, silver, etc...
    gemstone?: string // Type of stone in the ring
    carats?: number // quilates
}

type NecklaceAttributes = {
    length: string; // 16cm, 10cm, etc... 
    material: string // "gold", "silver", etc... 
    claspType: string // Tipo de corchete/broche/cierre
    chainType: string // "cable", "rope", "box"
}

type BraceletAttributes = {
    length: string // 16cm, 10cm, etc...
    material: string 
    claspType: string
    style: string // "chain", "bangle", etc... 
}

type EarringAttributes = {
    type: string; // "stud", "drop", "hoop"
    material: string // gold, silver, cooper, etc...
    backType: string // cierre o broche
    length?: string // for drop earrings
}

//* Combine the Types
type ProductAttributes = RingAttributes | NecklaceAttributes | BraceletAttributes | EarringAttributes;


// Document interface = what exists after saving in Mongo
// An interface that describes the properties that a Product Document has
export interface ProductInterface extends Document {
    // Base product info
    name: string;
    description: string; 
    basePrice: number; 
    productType: ProductTypes // "ring", "necklace", "bracelet", "earring"
    images: string[]; // Image URL's, stored in Cloudinary probably 
    stock: number; 
    reserved: number; // Stock locked by pending orders 
    category: string; 
    tags: string[]; 
    isActive: boolean; 

    discount: {
        percentage: number // number from 0 to 100
        isActive: boolean
        startDate?: Date 
        endDate?: Date 
    }

    // Polymorphic pattern
    attributes?: ProductAttributes; 

    // Virtual and methods
    finalPrice: number; // Virtual field
    isDiscountValid(): boolean; // Method

    createdAt: Date; 
    updatedAt: Date; 
}

// Attributes interface = what you must provide to create a product
export interface ProductAttrs {
    name: string;
    description: string; 
    basePrice: number; 
    productType: ProductTypes; 
    images: string[];
    stock: number; 
    category: string; 
    tags: string[]; 
    isActive: boolean; 
}

// Model interface = adds a build method that uses ProductAttrs
// An interface that describes the properties that are required to create a new Product
export interface ProductModel extends Model<ProductInterface> {
    build(attrs: ProductAttrs): ProductInterface;
}

// Define the Product document Schema
const productSchema : Schema = new Schema(
    {
        name: {
            type: String, 
            required: true, 
            trim: true, 
        }, 
        description: {
            type: String, 
            required: true, 
            trim: true, 
        }, 
        basePrice: {
            type: Number, 
            required: true, 
        }, 
        discount: {
            percentage: {
                type: Number,
                default: 0,
                min: 0,
                max: 100,
            },
            isActive: {
                type: Boolean,
                default: false,
            },
            startDate: {
                type: Date,
                required: false,
            },
            endDate: {
                type: Date,
                required: false,
            }
        },
        productType: {
            type: String, 
            required: true, 
            enum: Object.values(ProductTypes), 
        }, 
        images: [{
            type: String, 
            required: true, 
        }], 
        stock: {
            type: Number, 
            required: true, 
            min: 0, 
            default: 0 
        }, 
        reserved: {
            type: Number,
            default: 0,
            min: 0,
        },
        category: {
            type: String, 
            required: true, 
            trim: true, 
            index: true, // Index for faster filtering
        }, 
        tags: [{
            type: String, 
            trim: true
        }], 
        isActive: {
            type: Boolean, 
            default: true, 
            index: true // Index for faster filtering
        }, 
        attributes: {
            type: Schema.Types.Mixed, // Allows any structure
            required: false,
        }
    }, 
    {
        timestamps: true, // This includes Timestamps (createdAt, updatedAt)
        toJSON: { virtuals: true }, // This
        toObject: { virtuals: true } // This
    }
);

// Use the toJSON function from json.ts file
toJSON(productSchema);

//? Indexes
//* 1  = ASC  (Ascending order sorting: A → Z, 0 → 9)
//* -1 = DESC (Descending order sorting: Z → A, 9 → 0)

//~ Single Field Index
// This index speeds up queries that filter or sort by "tags".
// For example, if the UI needs to list products grouped or ordered by tags,
// this index helps MongoDB retrieve matching documents in alphabetical order
// directly from the B-Tree without scanning the entire collection.
productSchema.index({ tags: 1 });

//^ Compound Indexes
// This compound index helps queries that filter products by both "productType"
// and their active state. For example, an API endpoint that loads all active
// products of a specific type will avoid scanning non-matching combinations
// and return sorted/filtered results efficiently.
productSchema.index({ productType: 1, isActive: 1 });

// This index improves queries that retrieve active products for a given category.
// It becomes useful when building category pages or filtering items by category
// while enforcing active availability in the same query.
productSchema.index({ category: 1, isActive: 1 });

// This compound index optimizes queries that filter by a discount's active state
// and then apply a range query on "endDate". This becomes crucial when determining
// which discounts are currently valid or which ones are about to expire, since
// the B-Tree stores discount.isActive first and then sorts by endDate efficiently.
productSchema.index({ 'discount.isActive': 1, 'discount.endDate': 1 });

//TODO Text Index
// This index enables full-text search over the "name" and "description" fields.
// It is used when implementing keyword search functionality, allowing users to
// find products matching natural-language queries such as "running shoes" or
// "wireless headphones" without needing to run slow regex scans.
productSchema.index({ name: 'text', description: 'text' }); // For text search

// Virtual Field for Final Price
productSchema.virtual('finalPrice').get(function(this: ProductInterface) {
    if (!this.discount.isActive || this.discount.percentage === 0) {
        return this.basePrice;
    }
    
    const now = new Date();
    
    // Check date validity
    if (this.discount.startDate && now < this.discount.startDate) {
        return this.basePrice;
    }
    
    if (this.discount.endDate && now > this.discount.endDate) {
        return this.basePrice;
    }
    
    return Math.round(this.basePrice * (1 - this.discount.percentage / 100));
});

// Add method to check discount validity
productSchema.methods.isDiscountValid = function(): boolean {
    if (!this.discount.isActive || this.discount.percentage === 0) {
        return false;
    }
    
    const now = new Date();
    
    if (this.discount.startDate && now < new Date(this.discount.startDate)) {
        return false;
    }
    
    if (this.discount.endDate && now > new Date(this.discount.endDate)) {
        return false;
    }
    
    return true;
};

// Add  custom static "build" method
productSchema.statics.build = (attrs: ProductAttrs) => {
    return new Product(attrs);
}

// Now when we call the Product constructor it already has typescript validation
const Product = mongoose.model<ProductInterface, ProductModel>('Product', productSchema)

export default Product