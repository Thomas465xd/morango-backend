import request from "supertest"
import server from "../../../server"
import Product from "../../../models/Product";
import mongoose from "mongoose";

//? 📋 Input Validation Tests
describe("/stock/:productId Input Validation Tests", () => {
    it("Returns a 403 Forbidden for non admin user trying to access", async () => {
        const user = await global.createUser(true, false); 
        
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/stock/${product.id}`)
            .set("Cookie", global.setCookie(user.id))
            .send({
                stock: 8
            })
            .expect(403)

        console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(1);
    })

    it("Returns a 400 with no stock provided in the request body", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/stock/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({ })
            .expect(400)

        console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(2); 
        expect(response.body.errors[0].field).toEqual("stock");  
    }) 

    it("Returns a 400 with invalid stock provided (negative)", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/stock/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                stock: -2
            })
            .expect(400)

        console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("stock");  
    }) 

    it("Returns a 400 with invalid product id", async () => {
        const admin = await global.createUser(true, true); 
        await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/stock/invalid_id`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                stock: 8
            })
            .expect(400)

        console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("productId");  
    }) 
})

describe("updateProductStock Request Handler Tests", () => {
    it("Returns a 404 Product Not Found for non existent product trying to be updated", async () => {
        const admin = await global.createUser(true, true); 
        const productId = new mongoose.Types.ObjectId; 

        await request(server)
            .patch(`/api/products/stock/${productId}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                stock: 10
            })
            .expect(404)
    }) 

    it("Returns a 200 Product stock successfully updated", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        await request(server)
            .patch(`/api/products/stock/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                stock: 10
            })
            .expect(200)
        
        const updatedProduct = await Product.findById(product.id); 
        expect(updatedProduct.stock).toEqual(10); 
    }) 
})