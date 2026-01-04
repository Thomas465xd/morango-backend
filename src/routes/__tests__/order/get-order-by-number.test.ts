import request from "supertest"
import server from "../../../server"

//? 📋 Input Validation Tests
// describe("/api/orders/public/:trackingNumber Input Validation Tests", () => {
//     it("Returns a 400 with empty request body", async () => {
//         await request(server)
//             .post(`/api/orders/public/`)
//             .send({ })
//             .expect(400)
//     })
// })

describe("getOrderByNumber Request Handler Tests", () => {
    it("Returns a 404 with non-existent order", async () => {
        await request(server)
            .get(`/api/orders/public/invalid_number`)
            .expect(404)
    })

    it("Returns a 200 if order is successfully found & returned with proper sanitized data", async () => {
        const { order } = await global.createOrder()

        const response = await request(server)
            .get(`/api/orders/public/${order.trackingNumber}`)
            .expect(200)

        const { 
            trackingNumber, 
            status, 
            items, 
            totals, 
            shippingAddress, 
            shippingMethod, 
            customer
        } = response.body; 

        expect(trackingNumber).toEqual(order.trackingNumber)
        expect(status).toEqual(order.status)
        expect(totals.shipping).toEqual(order.shipping)
        expect(totals.subtotal).toEqual(order.subtotal)
        expect(totals.total).toEqual(order.total)
        expect(shippingMethod).toEqual(order.shippingMethod)
        expect(customer.name).toEqual(order.customer.name)
        expect(customer.surname).toEqual(order.customer.surname)
        expect(items.length).toEqual(2)
        expect(shippingAddress.country).toEqual(order.shippingAddress.country)
        expect(shippingAddress.region).toEqual(order.shippingAddress.region)
        expect(shippingAddress.city).toEqual(order.shippingAddress.city)
        expect(shippingAddress.cityArea).toEqual(order.shippingAddress.cityArea)
    })
})