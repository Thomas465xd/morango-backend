import request from "supertest"
import server from "../../../server"

//? 📋 Input Validation Tests
describe("Input Validation Tests", () => {
    it("Returns a 400 with invalid product type in query param (?productType)", async () => {
        const productType = "Collares" // Should be Collar

        const response = await request(server)
            .get(`/api/products?productType=${productType}`)
            .send()
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("productType");
    }) 

    it("Returns a 400 with invalid tags in query param (?tags=)", async () => {
        // This will be converted to ["", "", ""] so it will throw since it's empty
        const tags = ",,," // Should be strings and formed like ?tags=gold,red,elegant or ?tags=gold&tags=red

        const response = await request(server)
            .get(`/api/products?tags=${tags}`)
            .send()
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("tags");
    })
    
    it("Returns a 400 if ?sale= query param is not boolean", async () => {
        const sale = "yes"

        const response = await request(server)
            .get(`/api/products?sale=${sale}`)
            .send()
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("sale");
    }) 

    it("Returns a 400 if ?category= query param is provided but empty", async () => {
        const category = ""

        const response = await request(server)
            .get(`/api/products?category=${category}`)
            .send()
            .expect(400)

        expect(response.body.errors.length).toEqual(1);
        expect(response.body.errors[0].field).toEqual("category"); 
    }) 

    it("Returns a 400 if ?minPrice=&maxPrice query params are less than 0", async () => {
        const minPrice = -2
        const maxPrice = -8

        const r1 = await request(server)
            .get(`/api/products?minPrice=${minPrice}`)
            .send()
            .expect(400)
        
        const r2 = await request(server)
            .get(`/api/products?maxPrice=${maxPrice}`)
            .send()
            .expect(400)

        const r3 = await request(server)
            .get(`/api/products?minPrice=${minPrice}&maxPrice=${maxPrice}`)
            .send()
            .expect(400)

        expect(r1.body.errors.length).toEqual(1); 
        expect(r2.body.errors.length).toEqual(1); 
        expect(r3.body.errors.length).toEqual(2); 
    }) 

    it("Returns a 400 if ?isActive= query param is provided but empty", async () => {
        const isActive = ""

        const response = await request(server)
            .get(`/api/products?isActive=${isActive}`)
            .send()
            .expect(400)

        expect(response.body.errors.length).toEqual(2);
        expect(response.body.errors[0].field).toEqual("isActive"); 
    }) 

    it("Returns a 400 if ?isActive= query param is invalid (not boolean)", async () => {
        const isActive = "yes"

        const response = await request(server)
            .get(`/api/products?isActive=${isActive}`)
            .send()
            .expect(400)

        expect(response.body.errors.length).toEqual(1);
        expect(response.body.errors[0].field).toEqual("isActive"); 
    }) 

    it("Returns a 400 if ?sortBy= query param value is invalid (basePrice, name and category are valid)", async () => {
        const sortBy = "price"

        const response = await request(server)
            .get(`/api/products?sortBy=${sortBy}`)
            .send()
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("sortBy");
    }) 

    it("Returns a 400 if ?sortOrder= query param value is invalid (either 'asc' or 'desc')", async () => {
        const sortOrder = "ascendent"

        const response = await request(server)
            .get(`/api/products?sortOrder=${sortOrder}`)
            .send()
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("sortOrder");
    }) 
})

describe("getProducts Request Handler Tests", () => {
    it("Returns a 200 for a successful wells estructured response", async () => {
        await global.createProduct({ category: "collares", isActive: true, basePrice: 10000 })
        await global.createProduct({ category: "aros", isActive: false, basePrice: 25000 })
        await global.createProduct({ category: "pulseras", isActive: true, basePrice: 30000})
        await global.createProduct({ name: "Collar Inactivo", category: "collares", isActive: false, basePrice: 35000 }) 
        await global.createProduct({ name: "Collar Morango", category: "collares", isActive: true, basePrice: 45000 })
        await global.createProduct({ category: "collares", isActive: true, basePrice: 50000 })

        const category = "collares"
        const minPrice = 20000
        const maxPrice = 50000
        const sortBy = "basePrice"
        const sortOrder = "asc"
        const isActive = true

        const response = await request(server)
            .get(`/api/products?category=${category}&minPrice=${minPrice}&maxPrice=${maxPrice}&sortBy=${sortBy}&sortOrder=${sortOrder}&isActive=${isActive}`)
            .send() 
            .expect(200)

        //console.log(response.body)

        // Response format expectations
        expect(response.body.products.length).toEqual(2) // Since only two products should match this criteria
        expect(response.body.totalProducts).toEqual(2)
        expect(response.body.totalPages).toEqual(1)
        expect(response.body.perPage).toEqual(10);  // Since not provided
        expect(response.body.currentPage).toEqual(1); 
        expect(response.body.filters).toStrictEqual({
            productType: null,
            category: 'collares',
            priceRange: { min: '20000', max: '50000' },
            tags: null,
            onSale: false,
            sortBy: 'basePrice',
            sortOrder: 'asc'
        })
    })
    
    it("Returns a 200 for good 'sale' query param behaviour", async () => {
        await global.createProduct({ name: "Collar 1", basePrice: 100000, discount: { percentage: 10, isActive: true }}); 
        await global.createProduct({ name: "Collar 2", basePrice: 100000}); 
        await global.createProduct({ name: "Collar 3", basePrice: 100000}); 
        await global.createProduct({ name: "Collar 4", basePrice: 100000, discount: { percentage: 10, isActive: true }}); 
        await global.createProduct({ name: "Collar 5", basePrice: 100000, discount: { percentage: 10, isActive: true }}); 
        await global.createProduct({ name: "Collar 6", basePrice: 100000}); 

        const response = await request(server)
            .get(`/api/products?page=1&perPage=3&sale=true&sortBy=name&sortOrder=asc&isActive=true`)
            .send() 
            .expect(200)

        //console.log(response.body)

        // Response format expectations
        expect(response.body.products.length).toEqual(3) // Since only 3 products should have a discount

        // This attributes are added to the response in the controller using the enrichProducts function in /utils/product.ts
        expect(response.body.products[0].finalPrice).toEqual(90000)
        expect(response.body.products[0].hasActiveDiscount).toEqual(true)
        expect(response.body.products[0].savings).toEqual(10000)
        expect(response.body.products[0].availableStock).toEqual(8)

        expect(response.body.totalProducts).toEqual(3)
        expect(response.body.totalPages).toEqual(1)
        expect(response.body.perPage).toEqual(3);  // Since not provided
        expect(response.body.currentPage).toEqual(1); 
        expect(response.body.filters).toStrictEqual({
            productType: null,
            category: null,
            priceRange: null,
            tags: null,
            onSale: true, // Should be now true
            sortBy: 'name',
            sortOrder: 'asc'
        })
    }) 

    it("Returns a 200 for good 'tags' query param behaviour", async () => {
        await global.createProduct({ name: "Collar 1", tags: ["yellow", "blue", "green"]}); // ✅
        await global.createProduct({ name: "Collar 2", tags: ["red", "white", "green"]}); 
        await global.createProduct({ name: "Collar 3", tags: ["red", "blue", "green"]}); // ✅
        await global.createProduct({ name: "Collar 4", tags: ["red", "yellow", "black"]}); // ✅
        await global.createProduct({ name: "Collar 5", tags: ["red", "blue", "yellow"]}); // ✅
        await global.createProduct({ name: "Collar 6", tags: ["red", "purple", "green"]}); 

        const response = await request(server)
            .get(`/api/products?page=1&perPage=6&tags=yellow,blue&sortBy=name&sortOrder=asc&isActive=true`)
            .send() 
            .expect(200)

        console.log(response.body)

        // Response format expectations
        expect(response.body.products.length).toEqual(4) // Since only 3 products have those matching tags (blue OR yellow)

        // This attributes are added to the response in the controller using the enrichProducts function in /utils/product.ts
        expect(response.body.products[0].finalPrice).toEqual(20000)
        expect(response.body.products[0].hasActiveDiscount).toEqual(false)
        expect(response.body.products[0].savings).toEqual(0)
        expect(response.body.products[0].availableStock).toEqual(8)

        expect(response.body.totalProducts).toEqual(4) // Only 3 should match the criteria
        expect(response.body.totalPages).toEqual(1)
        expect(response.body.perPage).toEqual(6);  // Since not provided
        expect(response.body.currentPage).toEqual(1); 
        expect(response.body.filters).toStrictEqual({
            productType: null,
            category: null,
            priceRange: null,
            tags: [ 'yellow', 'blue' ],
            onSale: false, // Should be now true
            sortBy: 'name',
            sortOrder: 'asc'
        })
    }) 
})