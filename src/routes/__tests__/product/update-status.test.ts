import request from "supertest"
import server from "../../../server"
import Product from "../../../models/Product";
import mongoose from "mongoose";

//? 📋 Input Validation Tests
describe("/status/:productId Input Validation Tests", () => {
    it("Returns a 403 Forbidden for non admin user trying to access", async () => {
        const user = await global.createUser(true, false); 
        
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/status/${product.id}`)
            .set("Cookie", global.setCookie(user.id))
            .send({
                isActive: false
            })
            .expect(403)

        console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(1);
    })

    it("Returns a 400 with no isActive field provided in the request body", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/status/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({ })
            .expect(400)

        console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(2); 
        expect(response.body.errors[0].field).toEqual("isActive");  
    }) 

    it("Returns a 400 with invalid isActive field provided (not boolean)", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/status/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                isActive: "no"
            })
            .expect(400)

        console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("isActive");  
    }) 

    it("Returns a 400 with invalid product id", async () => {
        const admin = await global.createUser(true, true); 
        await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/status/invalid_id`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                isActive: false
            })
            .expect(400)

        console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("productId");  
    }) 
})

describe("updateProductStatus Request Handler Tests", () => {
    it("Returns a 404 Product Not Found for non existent product trying to be updated", async () => {
        const admin = await global.createUser(true, true); 
        const productId = new mongoose.Types.ObjectId; 

        await request(server)
            .patch(`/api/products/status/${productId}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                isActive: false
            })
            .expect(404)
    }) 

    it("Returns a 200 Product status successfully updated", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        await request(server)
            .patch(`/api/products/status/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                isActive: false
            })
            .expect(200)
        
        const updatedProduct = await Product.findById(product.id); 
        expect(updatedProduct.isActive).toEqual(false); 
    }) 
})