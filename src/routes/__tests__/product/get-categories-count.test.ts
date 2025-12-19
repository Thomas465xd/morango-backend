import request from "supertest"
import server from "../../../server"
import Product from "../../../models/Product";
import mongoose from "mongoose";

//? 📋 Input Validation Tests
// describe("Input Validation Tests", () => {
//     it("Returns a 400 if invalid :pr", async () => {
//         const user = await global.createUser(true, false); 
        
//         const product = await global.createProduct(); 

//         const response = await request(server)
//             .get(`/api/products/categories`)
//             .set("Cookie", global.setCookie(user.id))
//             .send()
//             .expect(400)

//         expect(response.body.errors.length).toEqual(1); 
//     })
// })

describe("getProductCategories Request Handler Tests", () => {
    it("Returns a 404 Categories Not Found if there are no products with any categories defined", async () => {
        await request(server)
            .get(`/api/products/categories`)
            .send()
            .expect(404)
    }) 

    it("Returns a 200 with a well structured response", async () => {
        await global.createProduct({ category: "collares" }); 
        await global.createProduct({ category: "aros" });  
        await global.createProduct({ category: "pulseras" }); 
        await global.createProduct({ category: "anillos" });
        await global.createProduct({ category: "aros" }); 
        await global.createProduct({ category: "collares" });
        await global.createProduct({ category: "collares" });

        const response = await request(server)
            .get(`/api/products/categories`)
            .send()
            .expect(200)

        console.log(response.body)

        expect(response.body.categories[0].productCount).toEqual(3); 
        expect(response.body.categories[1].productCount).toEqual(2); 
        expect(response.body.categories[2].productCount).toEqual(1); 
        expect(response.body.categories[3].productCount).toEqual(1); 

        expect(response.body.totalCategories).toEqual(4)
        expect(response.body.totalProducts).toEqual(7)
    })
})