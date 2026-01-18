import request from "supertest"
import server from "../../../server"
import mongoose from "mongoose";

//? 📋 Input Validation Tests
describe("/api/products/multiple?productIds= Input Validation Tests", () => {
    it("Returns a 400 if productIds query param not passed or passed as empty", async () => { 

        const r1 = await request(server)
            .get(`/api/products/multiple`)
            .send()
            .expect(400)
    
        const r2 = await request(server)
            .get(`/api/products/multiple?productIds[]=`)
            .send()
            .expect(400)

        // console.log(r1.body)

        expect(r1.body.errors.length).toEqual(1); 
        expect(r1.body.errors[0].field).toEqual("productIds")

        expect(r2.body.errors.length).toEqual(1); 
        expect(r2.body.errors[0].field).toEqual("productIds")
    })

    it("Returns a 400 if productIds query param is passed with invalid productIds", async () => { 
        const productIds = ["id-1", "id-2", "id-3"];

        const response = await request(server)
            .get(`/api/products/multiple?productIds=${productIds[0]}&productIds=${productIds[1]}`)
            .send()
            .expect(400)

        // console.log(response.body.errors)

        expect(response.body.errors.length).toEqual(2); 
        expect(response.body.errors[0].field).toEqual("productIds[0]")
        expect(response.body.errors[1].field).toEqual("productIds[1]")
    })
})

describe("getProductById Request Handler Tests", () => { 
    it("Returns a 404 Products Not Found", async () => {
        const id_1 = new mongoose.Types.ObjectId; 
        const id_2 = new mongoose.Types.ObjectId; 
        const id_3 = new mongoose.Types.ObjectId; 
        
        const productIds = [id_1, id_2, id_3];

        const response = await request(server)
            .get(`/api/products/multiple?productIds=${productIds[0]}&productIds=${productIds[1]}&productIds=${productIds[2]}`)
            .send()
            .expect(404)

        // console.log(response.body.errors)

        expect(response.body.errors[0].message).toEqual("Productos no Encontrados")
    })
    
    it("Returns a 404 if one or more products present in URL were not found", async () => {
        const product = await global.createProduct(); 

        const id_1 = new mongoose.Types.ObjectId; 
        const id_2 = new mongoose.Types.ObjectId; 
        
        const productIds = [id_1, id_2];

        const response = await request(server)
            .get(`/api/products/multiple?productIds=${productIds[0]}&productIds=${productIds[1]}&productIds=${product.id}`)
            .send()
            .expect(404)

        // console.log(response.body.errors)

        expect(response.body.errors[0].message).toEqual("Uno o mas productos no existen")
    }) 

    it("Returns a 200 OK for well structured response containing requested products & total of their prices", async () => {
        const { id: id_1 } = await global.createProduct({ basePrice: 20000 }); 
        const { id: id_2 } = await global.createProduct({ basePrice: 20000 }); 
        const { id: id_3 } = await global.createProduct({ basePrice: 20000 }); 
        
        const productIds = [id_1, id_2, id_3]; 

        const response = await request(server)
            .get(`/api/products/multiple?productIds=${productIds[0]}&productIds=${productIds[1]}&productIds=${productIds[2]}`)
            .send()
            .expect(200)
        
        //console.log(response.body)

        expect(response.body.products.length).toEqual(3)

        const {
            finalPrice, 
            hasActiveDiscount, 
            savings, 
            availableStock, 
        } = response.body.products[0]; 

        // Check product records were correctly enriched
        expect(finalPrice).toBeGreaterThan(0);
        expect(hasActiveDiscount).toBe(false) 
        expect(savings).toBeGreaterThanOrEqual(0); 
        expect(availableStock).toBeGreaterThanOrEqual(0);
        
        expect(response.body.total).toEqual(60000)
    })
})