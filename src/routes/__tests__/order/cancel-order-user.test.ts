import request from "supertest"
import server from "../../../server"
import Product from "../../../models/Product";
import mongoose from "mongoose";
import Order, { OrderStatus } from "../../../models/Order";

//? 📋 Input Validation Tests
describe("PATCH /api/orders/cancel/:orderId Input Validation Tests", () => {
    it("Returns a 401 Unauthorized if user making request not authenticated", async () => { 
        const { order } = await global.createOrder(); 

        await request(server)
            .patch(`/api/orders/cancel/${order.id}`)
            .send()
            .expect(401)
    })

    it("Returns a 400 with invalid :orderId param", async () => {
        const user = await global.createUser(true, false); 

        await request(server)
            .patch(`/api/orders/cancel/asdf`)
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(400)
    })
})

describe("cancelOrder Request Handler Tests", () => {
    it("Returns a 404 Not Found if order trying to be cancelled does not exist or does not belong to issuing user", async () => {
        const user = await global.createUser(true, false, "customer@customer.com"); 
        const orderId = new mongoose.Types.ObjectId; 

        await request(server)
            .patch(`/api/orders/cancel/${orderId}`)
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(404)

        const { order } = await global.createOrder();
        await request(server)
            .patch(`/api/orders/cancel/${order.id}`)
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(404)
    })

    it("Returns a 409 Request Conflict if order trying to be cancelled is already payed (status other than pending)", async () => {
        const user = await global.createUser(true, false); 
        const { order } = await global.createOrder(user, OrderStatus.Processing); 

        await request(server)
            .patch(`/api/orders/cancel/${order.id}`)
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(409)
    })

    it("Returns a 200 OK if order is successfully cancelled (also checks if reserved stock is released)", async () => {
        const user = await global.createUser(true, false); 
        const { order, firstProduct } = await global.createOrder(user, OrderStatus.Pending); 

        const stockReserved = await Product.findById(firstProduct.id); 
        expect(stockReserved.reserved).toBe(1); 

        await request(server)
            .patch(`/api/orders/cancel/${order.id}`)
            .send()
            .set("Cookie", global.setCookie(user.id))
            .expect(200)

        const stockReleased = await Product.findById(firstProduct.id); 
        expect(stockReleased.reserved).toBe(0); 

        // Check if order status has changed to Cancelled
        const cancelledOrder = await Order.findById(order.id); 
        expect(cancelledOrder.status).toEqual(OrderStatus.Cancelled)
    })
})