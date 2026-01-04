import request from "supertest"
import server from "../../../server"
import mongoose from "mongoose"

//? 📋 Input Validation Tests
describe("/api/orders/admin/:orderId Input Validation Tests", () => {
    it("Returns a 403 Forbidden if user trying to access isn't admin", async () => {
        const user = await global.createUser(true, false);
        
        const { order } = await global.createOrder(user); 

        await request(server)
            .get(`/api/orders/admin/${order.id}`)
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(403)
    })

    it("Returns a 400 with invalid orderId param", async () => {
        const admin = await global.createUser(true, true); 

        const response = await request(server)
            .get(`/api/orders/admin/invalid_id`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)

        expect(response.body.errors[0].field).toEqual('orderId')
    })
})

describe("getOrderByIdAdmin Request Handler Tests", () => {
    it("Returns a 404 with non-existent order trying to be accessed", async () => {
        const admin = await global.createUser(true, true); 

        const orderId = new mongoose.Types.ObjectId; // false order

        await request(server)
            .get(`/api/orders/admin/${orderId}`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(404)
    })

    // TODO: Check for payment details in the response
    it("Returns a 200 if order is successfully found & returned with proper sanitized data", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@customer.com");

        const { order } = await global.createOrder(customer)

        const response = await request(server)
            .get(`/api/orders/admin/${order.id}`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        expect(response.body.id).toEqual(order.id);
        expect(response.body.customer.userId).toEqual(customer.id); 
    })
}) 