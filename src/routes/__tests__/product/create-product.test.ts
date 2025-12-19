import request from "supertest"
import server from "../../../server"

//? 📋 Input Validation Tests
describe("Input Validation Tests", () => {
    it("Returns a 403 Forbidden for non admin user trying to access", async () => {
        const user = await global.createUser(true, false); 

        await request(server)
            .post(`/api/products`)
            .set("Cookie", global.setCookie(user.id))
            .send()
            .expect(403)
    })

    it("Returns a 400 with empty request body", async () => {
        const admin = await global.createUser(true, true); 

        await request(server)
            .post(`/api/products`)
            .set("Cookie", global.setCookie(admin.id))
            .send()
            .expect(400)
    }) 

    it("Returns a 400 with fields provided but empty", async () => {
        const admin = await global.createUser(true, true); 

        await request(server)
            .post(`/api/products`)
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

                }
            })
            .expect(400)
    }) 

    it("Returns a 400 with invalid price (negative)", async () => {
        const admin = await global.createUser(true, true); 

        const response = await request(server)
            .post(`/api/products`)
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
                stock: 0, 
                category: "Collares", 
                tags: [
                    "rojo", 
                    "elegante", 
                    "redstone"
                ], 
                isActive: true, 
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

    it("Returns a 400 with invalid stock (negative)", async () => {
        const admin = await global.createUser(true, true); 

        const response = await request(server)
            .post(`/api/products`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "Collar Morango", 
                description: "Test", 
                basePrice: 10000, // Should be positive
                productType: "Collar", 
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

    it("Returns a 400 with invalid image URL's", async () => {
        const admin = await global.createUser(true, true); 

        const response = await request(server)
            .post(`/api/products`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "Collar Morango", 
                description: "Test", 
                basePrice: 10000, // Should be positive
                productType: "Collar", 
                images: [
                    "invalid_url-1", 
                    "invalid_url-2", 
                    "invalid_url-3", 
                ], 
                stock: 2, 
                category: "Collares", 
                tags: [
                    "rojo", 
                    "elegante", 
                    "redstone"
                ], 
                isActive: true, 
                attributes: {
                    length: "10cm", 
                    material: "Plata",
                    claspType: "Langosta" , 
                    chainType: "Barbada"
                }
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(3); 
    }) 

    it("Returns a 400 with invalid stock (negative)", async () => {
        const admin = await global.createUser(true, true); 

        const response = await request(server)
            .post(`/api/products`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "Collar Morango", 
                description: "Test", 
                basePrice: 10000, // Should be positive
                productType: "Collar", 
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

    it("Returns a 400 with isActive not being boolean", async () => {
        const admin = await global.createUser(true, true); 

        const response = await request(server)
            .post(`/api/products`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "Collar Morango", 
                description: "Test", 
                basePrice: 10000, // Should be positive
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
                isActive: "yes", 
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

    it("Returns a 400 with productType not being inside ProductTypes enum", async () => {
        const admin = await global.createUser(true, true); 

        const response = await request(server)
            .post(`/api/products`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "Collar Morango", 
                description: "Test", 
                basePrice: 10000, // Should be positive
                productType: "T-shirt", 
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

        expect(response.body.errors.length).toEqual(2); 
    }) 
})

describe("createProduct Request Handler Tests", () => {
    it("Returns a 201 Product Created with correct product data", async () => {
        const admin = await global.createUser(true, true); 

        const response = await request(server)
            .post(`/api/products`)
            .set("Cookie", global.setCookie(admin.id))
            .send({
                name: "Collar Morango", 
                description: "Test", 
                basePrice: 10000, // Should be positive
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
            .expect(201)

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

        expect(name).toEqual("Collar Morango")
        expect(description).toEqual("Test")
        expect(basePrice).toEqual(10000)
        expect(productType).toEqual("Collar")
        expect(images.length).toEqual(3)
        expect(stock).toEqual(2)
        expect(reserved).toEqual(0)
        expect(category).toEqual("Collares")
        expect(tags.length).toEqual(3)
        expect(isActive).toEqual(true)
        expect(Object.keys(attributes).length).toEqual(4)
    }) 
})