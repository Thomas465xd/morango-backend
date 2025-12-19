import request from "supertest"
import server from "../../../server"
import Product from "../../../models/Product";
import mongoose from "mongoose";

//? 📋 Input Validation Tests
describe("Input Validation Tests", () => {
    it("Returns a 403 Forbidden for non admin user trying to access", async () => {
        const user = await global.createUser(true, false); 
        
        const product = await global.createProduct(); 

        const response = await request(server)
            .delete(`/api/products/${product.id}`)
            .set("Cookie", global.setCookie(user.id))
            .send()
            .expect(403)

        expect(response.body.errors.length).toEqual(1); 
    })

    it("Returns a 400 with invalid product id", async () => {
        const admin = await global.createUser(true, true); 
        await global.createProduct(); 

        const response = await request(server)
            .delete(`/api/products/invalid_id`)
            .set("Cookie", global.setCookie(admin.id))
            .send()
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
    }) 
})

describe("deleteProduct Request Handler Tests", () => {
    it("Returns a 404 Product Not Found for non existent products trying to be deleted", async () => {
        const admin = await global.createUser(true, true); 
        const productId = new mongoose.Types.ObjectId; 

        await request(server)
            .delete(`/api/products/${productId}`)
            .set("Cookie", global.setCookie(admin.id))
            .send()
            .expect(404)
    }) 

    it("Returns a 201 Product Created with correct product data", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        await request(server)
            .delete(`/api/products/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send()
            .expect(200)
        
        const deletedProduct = await Product.findById(product.id); 
        expect(deletedProduct).toBeNull(); 
    }) 
})