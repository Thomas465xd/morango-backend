import request from "supertest"
import server from "../../../server"
import Product from "../../../models/Product";
import mongoose from "mongoose";

//? 📋 Input Validation Tests
describe("/discounts/:productId Input Validation Tests", () => {
    it("Returns a 403 Forbidden for non admin user trying to access", async () => {
        const user = await global.createUser(true, false); 
        
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/discounts/${product.id}`)
            .set("Cookie", global.setCookie(user.id))
            .send({
                percentage: 40, 
                isActive: true
            })
            .expect(403)

        //console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(1);
    })

    it("Returns a 400 with empty request body send", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/discounts/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({ })
            .expect(400)

        //console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(4); 
    }) 

    it("Returns a 400 with fields provided that are empty", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/discounts/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                percentage: "", 
                isActive: "", 
                startDate: "", 
                endDate: ""
            })
            .expect(400)

        //console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(6); 
    }) 

    it("Returns a 400 with invalid product id", async () => {
        const admin = await global.createUser(true, true); 
        await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/discounts/invalid_id`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                percentage: 20, 
                isActive: true, 
            })
            .expect(400)

        //console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("productId");  
    }) 

    it("Returns a 400 with invalid percentage field (negative or greater than 100)", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/discounts/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                percentage: -1, 
                isActive: true, 
                startDate: "2026-12-12", 
                endDate: "2026-12-28"
            })
            .expect(400)

        await request(server)
            .patch(`/api/products/discounts/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                percentage: 110, 
                isActive: true, 
                startDate: "2026-12-12", 
                endDate: "2026-12-28"
            })
            .expect(400)

        console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("percentage"); 
    }) 

    it("Returns a 400 with invalid isActive field (not boolean)", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/discounts/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                percentage: 10, 
                isActive: "yes", 
                startDate: "2026-12-12", 
                endDate: "2026-12-28"
            })
            .expect(400)

        console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("isActive"); 
    }) 

    it("Returns a 400 with invalid startDate field (invalid ISO string)", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/discounts/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                percentage: 10, 
                isActive: true, 
                startDate: "12-12-2026", 
                endDate: "2026-12-28"
            })
            .expect(400)

        console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("startDate"); 
    }) 

    it("Returns a 400 with invalid endDate field (invalid ISO string)", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/discounts/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                percentage: 10, 
                isActive: true, 
                startDate: "2026-12-12", 
                endDate: "28-12-2026"
            })
            .expect(400)

        console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("endDate"); 
    }) 

    it("Returns a 400 with invalid startDate and endDate range", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/discounts/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                percentage: 10, 
                isActive: true, 
                startDate: "2026-12-12", // start date is more in the future than end date 
                endDate: "2026-12-6"
            })
            .expect(400)

        console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(2); 
        expect(response.body.errors[0].field).toEqual("endDate"); 
    })
})

describe("setProductDiscount Request Handler Tests", () => {
    it("Returns a 404 Product Not Found for non existent product trying to be updated", async () => {
        const admin = await global.createUser(true, true); 
        const productId = new mongoose.Types.ObjectId; 

        await request(server)
            .patch(`/api/products/discounts/${productId}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                percentage: 10, 
                isActive: true, 
                startDate: "2026-12-12", 
                endDate: "2026-12-28"
            })
            .expect(404)
    }) 

    it("Returns a 200 Product discount attributes are successfully updated", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        await request(server)
            .patch(`/api/products/discounts/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                percentage: 10, 
                isActive: true, 
                startDate: "2026-12-12", 
                endDate: "2026-12-28"
            })
            .expect(200)
        
        const updatedProduct = await Product.findById(product.id); 

        expect(updatedProduct.discount.percentage).toEqual(10); 
        expect(updatedProduct.discount.isActive).toEqual(true); 
        expect(updatedProduct.discount.startDate).toEqual(new Date("2026-12-12T00:00:00.000Z"));
        expect(updatedProduct.discount.endDate).toEqual(new Date("2026-12-28T00:00:00.000Z"));
    }) 
})