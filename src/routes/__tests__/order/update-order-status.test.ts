import request from "supertest"
import server from "../../../server"
import Product from "../../../models/Product";
import mongoose from "mongoose";
import Order, { OrderStatus } from "../../../models/Order";

//? 📋 Input Validation Tests
describe("PATCH /api/orders/admin/status/:orderId Input Validation Tests", () => {
    it("Returns a 403 Forbidden for non admin user trying to access", async () => {
        const customer = await global.createUser(true, false); 
        const { order } = await global.createOrder(); 

        await request(server)
            .patch(`/api/orders/admin/status/${order.id}`)
            .send({
                status: "Processing"
            })
            .set("Cookie", global.setCookie(customer.id))
            .expect(403)
    })

    it("Returns a 400 with invalid :orderId param", async () => {
        const admin = await global.createUser(true, true); 

        await request(server)
            .patch(`/api/orders/admin/status/asdf`)
            .send({
                status: "Processing"
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)
    })

    it("Returns a 400 Bad Request if provided status is invalid or empty (has to be Status Key)", async () => {
        const admin = await global.createUser(true, true); 
        const { order } = await global.createOrder(); 

        const r1 = await request(server)
            .patch(`/api/orders/admin/status/${order.id}`)
            .send({
                status: "Enviado" // Should be "Sent"
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)

        const r2 = await request(server)
            .patch(`/api/orders/admin/status/${order.id}`)
            .send({
                status: ""
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)

        expect(r1.body.errors[0].field).toEqual('status')
        expect(r1.body.errors.length).toEqual(1)

        expect(r2.body.errors[0].field).toEqual('status')
        expect(r2.body.errors.length).toEqual(2)
    })

    it("Returns a 400 with invalid deliveredAt in request body (empty, not ISO string in YYYY-MM-DD )", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@customer.com")

        const { order } = await global.createOrder(customer, OrderStatus.Delivered); 

        const r1 = await request(server)
            .patch(`/api/orders/admin/status/${order.id}`)
            .send({
                status: "Cancelled", 
                deliveredAt: ""
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)

        const r2 = await request(server)
            .patch(`/api/orders/admin/status/${order.id}`)
            .send({
                status: "Cancelled", 
                deliveredAt: "12-12-2026"
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)

        expect(r1.body.errors[0].field).toEqual("deliveredAt");
        expect(r1.body.errors.length).toEqual(2) // Delivered at was empty and malformed

        expect(r2.body.errors[0].field).toEqual("deliveredAt"); 
        expect(r2.body.errors.length).toEqual(1)
    })
})

describe("updateOrderStatus Request Handler Tests", () => {
    it("Returns a 404 Not Found if order trying to be updated does not exist", async () => {
        const admin = await global.createUser(true, true); 
        const orderId = new mongoose.Types.ObjectId

        await request(server)
            .patch(`/api/orders/admin/status/${orderId}`)
            .send({
                status: "Processing"
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(404)
    })

    it("Returns a 409 Request Conflict if status change is invalid (e.g. Delivered → Sent or Delivered → Delivered)", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@customer.com")

        const { order } = await global.createOrder(customer, OrderStatus.Delivered); 

        await request(server)
            .patch(`/api/orders/admin/status/${order.id}`)
            .send({
                status: "Processing"
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(409)

        await request(server)
            .patch(`/api/orders/admin/status/${order.id}`)
            .send({
                status: "Sent"
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(409)

        await request(server)
            .patch(`/api/orders/admin/status/${order.id}`)
            .send({
                status: "Pending"
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(409)

        await request(server)
            .patch(`/api/orders/admin/status/${order.id}`)
            .send({
                status: "Cancelled"
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(409)

        await request(server)
            .patch(`/api/orders/admin/status/${order.id}`)
            .send({
                status: "Expired"
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(409)

        // Should throw since it is current status
        await request(server)
            .patch(`/api/orders/admin/status/${order.id}`)
            .send({
                status: "Delivered"
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(409)
    })

    it("Returns a 200 OK if Processing and Sent status are successfully set along with reserved and sold stock updates", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@customer.com")

        const { order, firstProduct } = await global.createOrder(customer); 

        const reservedStock = await Product.findById(firstProduct.id); 
        expect(reservedStock.reserved).toEqual(1); 
        expect(reservedStock.stock).toEqual(8)

        const r1 = await request(server)
            .patch(`/api/orders/admin/status/${order.id}`)
            .send({
                status: "Processing"
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        const soldStock = await Product.findById(firstProduct.id)
        expect(soldStock.reserved).toEqual(0), 
        expect(soldStock.stock).toEqual(7)

        const updatedOrder = await Order.findById(order.id); 
        expect(updatedOrder.status).toEqual(OrderStatus.Processing); 

        expect(r1.body.order).toBeDefined(); 
        expect(r1.body.order.status).toEqual(OrderStatus.Processing);

        const r2 = await request(server)
            .patch(`/api/orders/admin/status/${order.id}`)
            .send({
                status: "Sent"
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        expect(r2.body.order).toBeDefined();
        expect(r2.body.order.status).toEqual(OrderStatus.Sent);
    })

    it("Returns a 200 OK if Delivered status is successfully set along with deliveredAt Date", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@customer.com")

        const { order } = await global.createOrder(customer, OrderStatus.Sent); 

        const response = await request(server)
            .patch(`/api/orders/admin/status/${order.id}`)
            .send({
                status: "Delivered", 
                deliveredAt: "2026-12-12"
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        const updatedOrder = await Order.findById(order.id); 
        expect(updatedOrder.status).toEqual(OrderStatus.Delivered); 
        expect(updatedOrder.deliveredAt).toEqual(new Date("2026-12-12T00:00:00.000Z"))

        expect(response.body.order).toBeDefined();
        expect(response.body.order.deliveredAt).toEqual("2026-12-12T00:00:00.000Z")
        expect(response.body.order.status).toEqual(OrderStatus.Delivered) 
    })

    it("Returns a 200 OK if Cancelled status is successfully set along stock releases (if Order was Pending)", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@customer.com")

        const { order, firstProduct } = await global.createOrder(customer); 

        const reservedStock = await Product.findById(firstProduct.id); 
        expect(reservedStock.reserved).toEqual(1); 

        const response = await request(server)
            .patch(`/api/orders/admin/status/${order.id}`)
            .send({
                status: "Cancelled", 
                deliveredAt: "2026-12-12"
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        const releasedStock = await Product.findById(firstProduct.id); 
        expect(releasedStock.reserved).toEqual(0); 

        const updatedOrder = await Order.findById(order.id); 
        expect(updatedOrder.status).toEqual(OrderStatus.Cancelled); 

        expect(response.body.order).toBeDefined();
        expect(response.body.order.status).toEqual(OrderStatus.Cancelled) 
    })

    it("Returns a 200 OK if Cancelled status is successfully set along with sold stock readded (if Order was Pending)", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@customer.com")

        const { order, firstProduct } = await global.createOrder(customer, OrderStatus.Processing); 

        const soldStock = await Product.findById(firstProduct.id); 
        expect(soldStock.reserved).toEqual(0); 
        expect(soldStock.stock).toEqual(7)

        const response = await request(server)
            .patch(`/api/orders/admin/status/${order.id}`)
            .send({
                status: "Cancelled", 
                deliveredAt: "2026-12-12"
            })
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        const readdedStock = await Product.findById(firstProduct.id); 
        expect(readdedStock.stock).toEqual(8); 

        const updatedOrder = await Order.findById(order.id); 
        expect(updatedOrder.status).toEqual(OrderStatus.Cancelled); 

        expect(response.body.order).toBeDefined();
        expect(response.body.order.status).toEqual(OrderStatus.Cancelled) 
    })
})