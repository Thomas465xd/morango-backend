import request from "supertest"
import server from "../../../server"
import { OrderStatus } from "../../../models/Order";

//? 📋 Input Validation Tests
describe("/api/orders/admin Input Validation Tests", () => {
    it("Returns a 403 Forbidden for non admin user trying to access", async () => {
        const customer = await global.createUser(true, false); 

        await request(server)
            .get(`/api/orders/admin`)
            .send()
            .set("Cookie", global.setCookie(customer.id))
            .expect(403)
    })

    it("Returns a 400 if ?status= query param is invalid (not inside OrderStatus enum or empty)", async () => {
        const user = await global.createUser(true, true); 

        const r1 = await request(server)
            .get(`/api/orders/admin?status=listo`)
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(400)

        const r2 = await request(server)
            .get(`/api/orders/admin?status=`)
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(400)
        
        expect(r1.body.errors[0].field).toEqual('status')
        expect(r1.body.errors.length).toEqual(1)

        expect(r2.body.errors[0].field).toEqual('status')
        expect(r2.body.errors.length).toEqual(2);  // Two errors, one for empty query param and the other for invalid status
    })

    it("Returns a 400 if ?email= query param is invalid (invalid email or empty)", async () => {
        const user = await global.createUser(true, true); 

        const r1 = await request(server)
            .get(`/api/orders/admin?email=invalid_email`)
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(400)

        const r2 = await request(server)
            .get(`/api/orders/admin?email=`)
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(400)
        
        expect(r1.body.errors[0].field).toEqual('email')
        expect(r1.body.errors.length).toEqual(1)

        expect(r2.body.errors[0].field).toEqual('email')
        expect(r2.body.errors.length).toEqual(2);  // Two errors, one for empty query param and the other for invalid status
    })

    it("Returns a 400 with invalid startDate query param (invalid ISO string)", async () => {
        const admin = await global.createUser(true, true); 
        
        await global.createOrder(); 

        const response = await request(server)
            .get(`/api/orders/admin?startDate=12-12-2026`)
            .set("Cookie", global.setCookie(admin.id))
            .send()
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("startDate"); 
    }) 

    it("Returns a 400 with invalid endDate field (invalid ISO string)", async () => {
        const admin = await global.createUser(true, true); 
        
        await global.createOrder(); 

        const response = await request(server)
            .get(`/api/orders/admin?endDate=28-12-2026`)
            .set("Cookie", global.setCookie(admin.id))
            .send()
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("endDate"); 
    }) 

    it("Returns a 400 with invalid startDate and endDate range", async () => {
        const admin = await global.createUser(true, true); 

        await global.createOrder(); 

        const response = await request(server)
            .get(`/api/orders/admin?startDate=2026-12-12&endDate=2026-12-6`) // strt date is more in the future than end date
            .set("Cookie", global.setCookie(admin.id))
            .send()
            .expect(400)

        expect(response.body.errors.length).toEqual(2); 
        expect(response.body.errors[0].field).toEqual("endDate"); 
    })

    it("Returns a 400 if ?sortOrder or ?sortBy query param is invalid (not asc or desc and not 'date')", async () => {
        const admin = await global.createUser(true, true); 

        const r1 = await request(server)
            .get(`/api/orders/admin?sortOrder=asdf`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)

        const r2 = await request(server)
            .get(`/api/orders/admin?sortOrder=asc&sortBy=createdAt`) // should be sortBy=date
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)

        expect(r1.body.errors[0].field).toEqual('sortOrder')
        expect(r1.body.errors.length).toEqual(1)

        expect(r2.body.errors[0].field).toEqual('sortBy')
        expect(r2.body.errors.length).toEqual(1)
    })
})

describe("getOrdersAdmin Request Handler Tests", () => {
    it("Returns a 200 OK and a well structured response containing pagination details & filters if present", async () => {
        const admin = await global.createUser(true, true, "admin@admin.com"); 

        const customer1 = await global.createUser(true, false, "customer@customer.com"); 
        const customer2 = await global.createUser(true, false, "customer2@customer2.com");

        const day1 = new Date("2026-01-01T10:00:00.000Z");
        const day2 = new Date("2026-01-02T10:00:00.000Z");
        const day3 = new Date("2026-01-03T10:00:00.000Z");

        await global.createOrder(customer1, OrderStatus.Sent, day1);
        await global.createOrder(customer1, OrderStatus.Delivered, day2);
        await global.createOrder(customer2, OrderStatus.Delivered, day3);

        const status = "Delivered"; 

        const sortOrder = "asc"

        // Test email filter
        const r1 = await request(server)
            .get(`/api/orders/admin?page=1&perPage=5&email=customer@customer.com`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // Test status filter
        const r2 = await request(server)
            .get(`/api/orders/admin?page=1&perPage=5&status=${status}`) // Use the key instead of the value, it will be mapped
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)
            
        // Test sorting
        const r3 = await request(server)
            .get(`/api/orders/admin?page=1&perPage=5&sortBy=date&sortOrder=${sortOrder}`) // asc means orders will be sorted from first one created to last one.
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // Test Date ranges
        // Between
        const r4 = await request(server)
            .get(`/api/orders/admin?page=1&perPage=5&startDate=2026-01-02&endDate=2026-01-03`) // asc means orders will be sorted from first one created to last one.
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // Starting from...
        const r5 = await request(server)
            .get(`/api/orders/admin?page=1&perPage=5&startDate=2026-01-02`) // asc means orders will be sorted from first one created to last one.
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // Before...
        const r6 = await request(server)
            .get(`/api/orders/admin?page=1&perPage=5&endDate=2026-01-02T23:59:59.999Z`) // asc means orders will be sorted from first one created to last one.
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        expect(r1.body.orders).toBeDefined(); 
        expect(r1.body.orders.length).toEqual(2); // Two orders were created by this client 
        expect(r1.body.totalOrders).toEqual(2); 
        expect(r1.body.totalPages).toEqual(1); 
        expect(r1.body.perPage).toEqual(5); 
        expect(r1.body.currentPage).toEqual(1);
        expect(r1.body.filters.status).toEqual(null); 
        expect(r1.body.filters.email).toEqual("customer@customer.com")
        expect(r1.body.filters.sortBy).toEqual('createdAt')
        expect(r1.body.filters.sortOrder).toEqual("desc");   

        // Test dates (first two order should be the one with "Entregado" and second "En Transito" status)
        expect(r1.body.orders[0].status).toEqual("Entregado")
        expect(r1.body.orders[1].status).toEqual("En Transito")

        expect(r2.body.orders).toBeDefined(); 
        expect(r2.body.orders.length).toEqual(2); // Only 2 orders should match the criteria
        expect(r2.body.orders[0].status).toEqual("Entregado") // Use value not key
        expect(r2.body.orders[1].status).toEqual("Entregado")

        expect(r2.body.totalOrders).toEqual(2); 
        expect(r2.body.totalPages).toEqual(1); 
        expect(r2.body.perPage).toEqual(5); 
        expect(r2.body.currentPage).toEqual(1);
        expect(r2.body.filters.status).toEqual("Delivered"); 
        expect(r2.body.filters.sortBy).toEqual('createdAt')
        expect(r2.body.filters.sortOrder).toEqual("desc");  

        // Test sortOrder & sortBy
        expect(r3.body.orders[0].status).toEqual("En Transito")
        expect(r3.body.filters.sortOrder).toEqual("asc") 
        expect(r3.body.filters.sortBy).toEqual("date")

        // Test date ranges
        expect(r4.body.orders.length).toBe(1);
        expect(r4.body.orders[0].status).toBe("Entregado");

        expect(r5.body.orders.length).toBe(2);

        expect(r6.body.orders.length).toBe(2);
    })
})