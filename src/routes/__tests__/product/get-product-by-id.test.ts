import request from "supertest"
import server from "../../../server"
import Product from "../../../models/Product";
import mongoose from "mongoose";

//? 📋 Input Validation Tests
describe("Input Validation Tests", () => {
    it("Returns a 400 if invalid :productId in URL", async () => {
        const user = await global.createUser(true, false); 
        
        const product = await global.createProduct(); 

        const response = await request(server)
            .get(`/api/products/${product.id}asdf`)
            .set("Cookie", global.setCookie(user.id))
            .send()
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
    })
})

describe("getProductById Request Handler Tests", () => {
    it("Returns a 404 Product Not Found", async () => {
        const admin = await global.createUser(true, true); 
        const productId = new mongoose.Types.ObjectId; 

        await request(server)
            .get(`/api/products/${productId}`)
            .set("Cookie", global.setCookie(admin.id))
            .send()
            .expect(404)
    }) 

    it("Returns a 200 Product Created with correct product data and also returns related products", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct();

        await global.createProduct(); 
        await global.createProduct();  

        const response = await request(server)
            .get(`/api/products/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send()
            .expect(200)
        
        //console.log(response.body)

        const { 
            name, 
            description, 
            basePrice, 
            productType, 
            images, 
            stock, 
            reserved, 
            category, 
            tags, 
            isActive, 
            attributes, 
            finalPrice, 
            hasActiveDiscount, 
            savings, 
            availableStock, 
            relatedProducts
        } = response.body; 

        expect(name).toEqual("Collar Test")
        expect(description).toEqual("Descripción Test")
        expect(basePrice).toEqual(20000)
        expect(productType).toEqual("Collar")
        expect(images.length).toEqual(3)
        expect(stock).toEqual(8)
        expect(reserved).toEqual(0)
        expect(category).toEqual("Collares")
        expect(tags.length).toEqual(3)
        expect(isActive).toEqual(true)
        expect(Object.keys(attributes).length).toEqual(4)
        expect(finalPrice).toEqual(20000)
        expect(hasActiveDiscount).toEqual(false)

        // Attributes returned by the request handler
        expect(savings).toEqual(0) // Base Price - Final Price only if discount is present
        expect(availableStock).toEqual(8) // stock - reserved
        expect(relatedProducts.length).toEqual(2) // The other two created products
    })
})