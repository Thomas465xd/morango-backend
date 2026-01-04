import request from "supertest"
import server from "../../../server"
import mongoose from "mongoose"

//? 📋 Input Validation Tests
describe("/api/orders/:orderId Input Validation Tests", () => {
    it("Returns a 401 Unauthorized if user is not authenticated", async () => {
        const user = await global.createUser(true, false); 
        const { order } = await global.createOrder(user); 

        await request(server)
            .get(`/api/orders/${order.id}`)
            .send()
            .expect(401)
    })

    it("Returns a 400 with invalid orderId param", async () => {
        const user = await global.createUser(true, false); 

        const response = await request(server)
            .get(`/api/orders/invalid_id`)
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(400)

        expect(response.body.errors[0].field).toEqual('orderId')
    })
})

describe("getAuthUserOrderById Request Handler Tests", () => {
    it("Returns a 404 with non-existent order or order belonging to another user", async () => {
        const user1 = await global.createUser(true, false, "email@email.com"); 
        const user2 = await global.createUser(true, false, "test@test.com"); 

        const firstOrder = new mongoose.Types.ObjectId; // false order
        const { order: secondOrder } = await global.createOrder(user2); 
        const { order: thirdOrder } = await global.createOrder(); 

        await request(server)
            .get(`/api/orders/${firstOrder}`)
            .send()
            .set("Cookie", global.setCookie(user1.id))
            .expect(404)

        await request(server)
            .get(`/api/orders/${secondOrder.id}`)
            .send()
            .set("Cookie", global.setCookie(user1.id)) // trying to be accessed by other user
            .expect(404)

        await request(server)
            .get(`/api/orders/${thirdOrder.id}`)
            .send()
            .set("Cookie", global.setCookie(user1.id)) // trying to be accessed by other user
            .expect(404)
    })

    // TODO: Check for payment details in the response
    it("Returns a 200 if order is successfully found & returned with proper sanitized data", async () => {
        const user = await global.createUser(true, false, "email@email.com"); 

        const { order } = await global.createOrder(user)

        const response = await request(server)
            .get(`/api/orders/${order.id}`)
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(200)

        expect(response.body.id).toEqual(order.id)
        expect(response.body.customer.userId).toEqual(user.id)
    })
}) 