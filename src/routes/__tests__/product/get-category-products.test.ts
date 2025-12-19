import request from "supertest"
import server from "../../../server"
import Product from "../../../models/Product";
import mongoose from "mongoose";

//? 📋 Input Validation Tests
// describe("Input Validation Tests", () => {
//     it("Returns a 400 if invalid :categoryName url param", async () => {
//         const user = await global.createUser(true, false); 

//         const response = await request(server)
//             .get(`/api/products/categories/,,,`)
//             .set("Cookie", global.setCookie(user.id))
//             .send()
//             .expect(400)

//         expect(response.body.errors.length).toEqual(1); 
//     })
// })

describe("getProductCategoryName Request Handler Tests", () => {

    it("Returns a 200 with a well structured response", async () => {
        await global.createProduct({ category: "collares" }); 
        await global.createProduct({ category: "aros" });  
        await global.createProduct({ category: "pulseras" }); 
        await global.createProduct({ category: "anillos" });
        await global.createProduct({ category: "aros" }); 
        await global.createProduct({ category: "collares" });
        await global.createProduct({ category: "collares" });

        const response = await request(server)
            .get(`/api/products/categories/aros`)
            .send()
            .expect(200)

        //console.log(response.body)

        expect(response.body.products[0].category).toEqual("aros")
        expect(response.body.products[1].category).toEqual("aros")

        expect(response.body.totalProducts).toEqual(2)
        expect(response.body.totalPages).toEqual(1)
        expect(response.body.perPage).toEqual(10) // 10 since it was not provided
        expect(response.body.currentPage).toEqual(1) // 1 since it was not provided
        expect(response.body.categoryName).toEqual("aros")
    })
})