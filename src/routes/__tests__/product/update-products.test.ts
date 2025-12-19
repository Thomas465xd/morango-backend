import request from "supertest"
import server from "../../../server"
import Product from "../../../models/Product";
import mongoose from "mongoose";

//? 📋 Input Validation Tests
describe("Input Validation Tests", () => {
    it("Returns a 403 Forbidden for non admin user trying to access", async () => {
        const user = await global.createUser(true, false); 
        
        const product = await global.createProduct(); 

        await request(server)
            .patch(`/api/products/${product.id}`)
            .set("Cookie", global.setCookie(user.id))
            .send()
            .expect(403)
    })

    it("Returns a 400 with invalid product id", async () => {
        const admin = await global.createUser(true, true); 
        await global.createProduct(); 

        await request(server)
            .patch(`/api/products/invalid_id`)
            .set("Cookie", global.setCookie(admin.id))
            .send()
            .expect(400)
    }) 

    it("Returns a 400 with provided fields that are empty", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "", 
                description: "", 
                basePrice: "", 
                productType: "", 
                images: [], 
                stock: "", 
                category: "", 
                tags: [], 
                isActive: "", 
                attributes: {
                    length: "", 
                    material: "",
                    claspType: "" , 
                    chainType: ""
                }
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(9); 
    }) 

    it("Returns a 400 with invalid basePrice (negative)", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "Collar Morango", 
                description: "Test", 
                basePrice: -10000, // Should be positive
                productType: "Collar", 
                images: [
                    "https://cloudinary.com/image-1", 
                    "https://cloudinary.com/image-2", 
                    "https://cloudinary.com/image-3", 
                ], 
                stock: 2, 
                category: "Collares", 
                tags: [
                    "rojo", 
                    "elegante", 
                    "redstone"
                ], 
                isActive: "true", 
                // this attributes apply to a Necklace
                attributes: {
                    length: "10cm", 
                    material: "Plata",
                    claspType: "Langosta" , 
                    chainType: "Barbada"
                }
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
    }) 

    it("Returns a 400 with invalid productType (outside ProductTypes Enum)", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "Collar Morango", 
                description: "Test", 
                basePrice: 10000, // Should be positive
                productType: "Collares", // Should be Collar
                images: [
                    "https://cloudinary.com/image-1", 
                    "https://cloudinary.com/image-2", 
                    "https://cloudinary.com/image-3", 
                ], 
                stock: 2, 
                category: "Collares", 
                tags: [
                    "rojo", 
                    "elegante", 
                    "redstone"
                ], 
                isActive: true, 
                // this attributes apply to a Necklace
                attributes: {
                    length: "10cm", 
                    material: "Plata",
                    claspType: "Langosta" , 
                    chainType: "Barbada"
                }
            })
            .expect(400)

        //console.log(response.body.errors)
        expect(response.body.errors.length).toEqual(2); 
    }) 

    it("Returns a 400 with isActive not being boolean", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "Collar Morango", 
                description: "Test", 
                basePrice: 10000, // Should be positive
                productType: "Collar", // Should be Collar
                images: [
                    "https://cloudinary.com/image-1", 
                    "https://cloudinary.com/image-2", 
                    "https://cloudinary.com/image-3", 
                ], 
                stock: 2, 
                category: "Collares", 
                tags: [
                    "rojo", 
                    "elegante", 
                    "redstone"
                ], 
                isActive: "yes", 
                // this attributes apply to a Necklace
                attributes: {
                    length: "10cm", 
                    material: "Plata",
                    claspType: "Langosta" , 
                    chainType: "Barbada"
                }
            })
            .expect(400)

        //console.log(response.body.errors)
        expect(response.body.errors.length).toEqual(1); 
    }) 

    it("Returns a 400 with invalid Stock (negative)", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "Collar Morango", 
                description: "Test", 
                basePrice: 10000, // Should be positive
                productType: "Collar", // Should be Collar
                images: [
                    "https://cloudinary.com/image-1", 
                    "https://cloudinary.com/image-2", 
                    "https://cloudinary.com/image-3", 
                ], 
                stock: -2, 
                category: "Collares", 
                tags: [
                    "rojo", 
                    "elegante", 
                    "redstone"
                ], 
                isActive: true, 
                // this attributes apply to a Necklace
                attributes: {
                    length: "10cm", 
                    material: "Plata",
                    claspType: "Langosta" , 
                    chainType: "Barbada"
                }
            })
            .expect(400)

        //console.log(response.body.errors)
        expect(response.body.errors.length).toEqual(1); 
    }) 

    it("Returns a 400 with invalid image URL's", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "Collar Morango", 
                description: "Test", 
                basePrice: 10000, // Should be positive
                productType: "Collar", // Should be Collar
                images: [
                    "invalid_image-1", 
                    "invalid_image-2", 
                    "invalid_image-3", 
                ], 
                stock: 2, 
                category: "Collares", 
                tags: [
                    "rojo", 
                    "elegante", 
                    "redstone"
                ], 
                isActive: true, 
                // this attributes apply to a Necklace
                attributes: {
                    length: "10cm", 
                    material: "Plata",
                    claspType: "Langosta" , 
                    chainType: "Barbada"
                }
            })
            .expect(400)

        //console.log(response.body.errors)
        expect(response.body.errors.length).toEqual(3); 
    }) 

    it("Returns a 400 with invalid attributes for selected productType", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "Aros Morango", 
                description: "Test", 
                basePrice: 10000, // Should be positive
                productType: "Aros", // Should be Collar
                images: [
                    "https://cloudinary.com/image-1", 
                    "https://cloudinary.com/image-2", 
                    "https://cloudinary.com/image-3", 
                ], 
                stock: 2, 
                category: "Collares", 
                tags: [
                    "rojo", 
                    "elegante", 
                    "redstone"
                ], 
                isActive: true, 
                // this attributes apply to a Necklace
                attributes: {
                    length: "10cm", 
                    material: "Plata",
                    claspType: "Langosta" , 
                    chainType: "Barbada"
                }
            })
            .expect(400)

        //console.log(response.body.errors)
        expect(response.body.errors.length).toEqual(1); 
    }) 

    it("Returns a 400 if more than 10 tags are provided", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "Collar Morango", 
                description: "Test", 
                basePrice: 10000, // Should be positive
                productType: "Collar", // Should be Collar
                images: [
                    "https://cloudinary.com/image-1", 
                    "https://cloudinary.com/image-2", 
                    "https://cloudinary.com/image-3", 
                ], 
                stock: 2, 
                category: "Collares", 
                tags: [
                    "1", 
                    "2", 
                    "3", 
                    "4", 
                    "5", 
                    "6", 
                    "7", 
                    "8", 
                    "9", 
                    "10", 
                    "11"
                ], 
                isActive: true, 
                // this attributes apply to a Necklace
                attributes: {
                    length: "10cm", 
                    material: "Plata",
                    claspType: "Langosta" , 
                    chainType: "Barbada"
                }
            })
            .expect(400)

        //console.log(response.body.errors)
        expect(response.body.errors.length).toEqual(1); 
    }) 
})

describe("updateProduct Request Handler Tests", () => {
    it("Returns a 404 Product Not Found", async () => {
        const admin = await global.createUser(true, true); 
        const productId = new mongoose.Types.ObjectId;  

        const response = await request(server)
            .patch(`/api/products/${productId}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "Collar Morango", 
                description: "Test", 
                basePrice: 10000, // Should be positive
                productType: "Collar", // Should be Collar
                images: [
                    "https://cloudinary.com/image-1", 
                    "https://cloudinary.com/image-2", 
                    "https://cloudinary.com/image-3", 
                ], 
                stock: 2, 
                category: "Collares", 
                tags: [
                    "Rojo", 
                    "Elegante", 
                    "Redstone"
                ], 
                isActive: true, 
                // this attributes apply to a Necklace
                attributes: {
                    length: "10cm", 
                    material: "Plata",
                    claspType: "Langosta" , 
                    chainType: "Barbada"
                }
            })
            .expect(404)

        //console.log(response.body.errors)
        expect(response.body.errors.length).toEqual(1); 
    }) 

    it("Returns a 200 if product is updated successfully", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "Collar Morango", 
                description: "Test", 
                basePrice: 10000, // Should be positive
                productType: "Collar", // Should be Collar
                images: [
                    "https://cloudinary.com/image-1", 
                    "https://cloudinary.com/image-2", 
                    "https://cloudinary.com/image-3", 
                ], 
                stock: 2, 
                category: "Collares", 
                tags: [
                    "Rojo", 
                    "Elegante", 
                    "Redstone"
                ], 
                isActive: false, 
                // this attributes apply to a Necklace
                attributes: {
                    length: "10cm", 
                    material: "Plata",
                    claspType: "Langosta" , 
                    chainType: "Barbada"
                }
            })
            .expect(200)

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
            attributes
        } = response.body.product; 

        //console.log(response.body.product)

        expect(name).toEqual("Collar Morango")
        expect(description).toEqual("Test")
        expect(basePrice).toEqual(10000)
        expect(productType).toEqual("Collar")
        expect(images.length).toEqual(3)
        expect(stock).toEqual(2)
        expect(reserved).toEqual(0)
        expect(category).toEqual("Collares")
        expect(tags.length).toEqual(3)
        expect(isActive).toEqual(false)
        expect(Object.keys(attributes).length).toEqual(4)
    }) 

    it("Returns a 200 if product is updated with another productType and it's corresponding new attributes", async () => {
        const admin = await global.createUser(true, true); 
        const product = await global.createProduct(); 

        const response = await request(server)
            .patch(`/api/products/${product.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "Aros Morango", 
                description: "Aros Test", 
                basePrice: 20000, // Should be positive
                productType: "Aros", // Should be Collar
                images: [
                    "https://cloudinary.com/image-1", 
                    "https://cloudinary.com/image-2", 
                    "https://cloudinary.com/image-3", 
                ], 
                stock: 2, 
                category: "Collares", 
                tags: [
                    "Rojo",  
                    "Elegante", 
                    "Redstone"
                ], 
                isActive: false, 
                // this attributes apply to a Necklace
                attributes: {
                    type: "Drop", 
                    material: "Gold", 
                    backType: "Langosta", 
                    length: "5cm"
                }
            })
            .expect(200)

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
            attributes
        } = response.body.product; 

        //console.log(response.body.product)

        expect(name).toEqual("Aros Morango")
        expect(description).toEqual("Aros Test")
        expect(basePrice).toEqual(20000)
        expect(productType).toEqual("Aros")
        expect(images.length).toEqual(3)
        expect(stock).toEqual(2)
        expect(reserved).toEqual(0)
        expect(category).toEqual("Collares")
        expect(tags.length).toEqual(3)
        expect(isActive).toEqual(false)
        expect(Object.keys(attributes).length).toEqual(4)
    }) 
})