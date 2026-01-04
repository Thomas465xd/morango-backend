import request from "supertest"
import server from "../../../server"
import { OrderStatus } from "../../../models/Order";

//? 📋 Input Validation Tests
describe("Input Validation Tests", () => {
    it("Returns a 401 if user is not authenticated", async () => {
        await request(server)
            .get(`/api/orders`)
            .send()
            .expect(401)
    })

    it("Returns a 400 if ?status= query param is invalid (not inside OrderStatus enum or empty)", async () => {
        const user = await global.createUser(true, false); 

        const r1 = await request(server)
            .get(`/api/orders?status=listo`)
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(400)

        const r2 = await request(server)
            .get(`/api/orders?status=`)
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(400)
        
        expect(r1.body.errors[0].field).toEqual('status')
        expect(r1.body.errors.length).toEqual(1)

        expect(r2.body.errors[0].field).toEqual('status')
        expect(r2.body.errors.length).toEqual(2);  // Two errors, one for empty query param and the other for invalid status
    })

    it("Returns a 400 if ?sortOrder or ?sortBy query param is invalid (not asc or desc and not 'date')", async () => {
        const user = await global.createUser(true, false); 

        const r1 = await request(server)
            .get(`/api/orders?sortOrder=asdf`)
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(400)

        const r2 = await request(server)
            .get(`/api/orders?sortOrder=asc&sortBy=createdAt`) // should be sortBy=date
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(400)

        expect(r1.body.errors[0].field).toEqual('sortOrder')
        expect(r1.body.errors.length).toEqual(1)

        expect(r2.body.errors[0].field).toEqual('sortBy')
        expect(r2.body.errors.length).toEqual(1)
    })
})

describe("getAuthUserOrders Request Handler Tests", () => {
    it("Returns a 200 OK and a well structured response containing pagination details & filters if present", async () => {
        const user = await global.createUser(true, false); 

        await global.createOrder(user, OrderStatus.Sent) // First order created
        await global.createOrder(user, OrderStatus.Delivered)
        await global.createOrder(user, OrderStatus.Delivered) // Last order created


        const r1 = await request(server)
            .get(`/api/orders?page=1&perPage=5`)
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(200)

        const r2 = await request(server)
            .get(`/api/orders?page=1&perPage=5&status=Delivered`) // Use the key instead of the value, it will be mapped
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(200)
            
        const r3 = await request(server)
            .get(`/api/orders?page=1&perPage=5&sortBy=date&sortOrder=asc`) // asc means orders will be sorted from first one created to last one.
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(200)

        expect(r1.body.orders).toBeDefined(); 
        expect(r1.body.orders.length).toEqual(3); 
        expect(r1.body.totalOrders).toEqual(3); 
        expect(r1.body.totalPages).toEqual(1); 
        expect(r1.body.perPage).toEqual(5); 
        expect(r1.body.currentPage).toEqual(1);
        expect(r1.body.filters.status).toEqual(null); 
        expect(r1.body.filters.sortBy).toEqual('createdAt')
        expect(r1.body.filters.sortOrder).toEqual(-1);   

        // Test dates (first two orders should be the ones with "Entregado" status)
        expect(r1.body.orders[0].status).toEqual("Entregado")
        expect(r1.body.orders[1].status).toEqual("Entregado")

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
        expect(r2.body.filters.sortOrder).toEqual(-1);  

        // Test sortOrder by date param 
        expect(r3.body.orders[0].status).toEqual("En Transito")
        expect(r3.body.filters.sortOrder).toEqual(1) // 1 equals asc
        expect(r3.body.filters.sortBy).toEqual("date")
    })
})