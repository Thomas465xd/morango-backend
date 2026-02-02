import request from "supertest"
import server from "../../../server"
import Product from "../../../models/Product";
import Order, { OrderStatus } from "../../../models/Order";
import Payment, { PaymentStatus } from "../../../models/Payment";
import mongoose from "mongoose";

//? 📋 DELETE /api/orders/admin/:orderId - Input Validation Tests
describe("DELETE /api/orders/admin/:orderId - Input Validation", () => {
    it("Returns 403 Forbidden for non-admin user", async () => {
        const customer = await global.createUser(true, false); 
        const { order } = await global.createOrder(); 

        await request(server)
            .delete(`/api/orders/admin/${order.id}`)
            .set("Cookie", global.setCookie(customer.id))
            .expect(403)
    })

    it("Returns 400 Bad Request with invalid ObjectId", async () => {
        const admin = await global.createUser(true, true); 

        await request(server)
            .delete(`/api/orders/admin/invalid-id`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)
    })
})

//? DELETE /api/orders/admin/:orderId - deleteOrder request handler Tests
describe("deleteOrder request handler", () => {
    it("Returns 404 Not Found if order does not exist", async () => {
        const admin = await global.createUser(true, true); 
        const orderId = new mongoose.Types.ObjectId();

        const response = await request(server)
            .delete(`/api/orders/admin/${orderId}`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(404)

        expect(response.body.errors[0].message).toContain("no Encontrada")
    })

    it("Returns 409 Conflict when deleting order with approved payment", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order } = await global.createOrder(customer, OrderStatus.Processing)

        // Create approved payment
        const payment = await global.createPayment(order, "MP-12345")
        order.paymentId = payment.id
        await order.save()

        const response = await request(server)
            .delete(`/api/orders/admin/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(409)

        expect(response.body.errors[0].message).toContain("pagos aprobados")
        expect(response.body.errors[0].message).toContain("archiva")
        
        // Verify order still exists
        const stillExists = await Order.findById(order.id)
        expect(stillExists).toBeDefined()
    })

    it("Returns 409 Conflict when deleting delivered order", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order } = await global.createOrder(customer, OrderStatus.Delivered)

        const response = await request(server)
            .delete(`/api/orders/admin/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(409)

        expect(response.body.errors[0].message).toContain("entregadas")
        expect(response.body.errors[0].message).toContain("archiva")

        // Verify order still exists
        const stillExists = await Order.findById(order.id)
        expect(stillExists).toBeDefined()
    })

    it("Successfully deletes pending order without payment and releases reserved stock", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order, firstProduct, secondProduct } = await global.createOrder(customer, OrderStatus.Pending)

        // Verify stock is reserved
        let product1 = await Product.findById(firstProduct.id)
        expect(product1.reserved).toBe(1)

        const response = await request(server)
            .delete(`/api/orders/admin/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // Verify order is deleted
        const deletedOrder = await Order.findById(order.id)
        expect(deletedOrder).toBeNull()

        // Verify stock was released
        product1 = await Product.findById(firstProduct.id)
        expect(product1.reserved).toBe(0)
    })

    it("Successfully deletes processing order without payment and restores stock to inventory", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order, firstProduct } = await global.createOrder(customer, OrderStatus.Processing)

        // Stock should be sold (not reserved)
        let product = await Product.findById(firstProduct.id)
        expect(product.reserved).toBe(0)
        expect(product.stock).toBe(7) // 8 - 1 sold

        const response = await request(server)
            .delete(`/api/orders/admin/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // Verify order is deleted
        const deletedOrder = await Order.findById(order.id)
        expect(deletedOrder).toBeNull()

        // Verify stock was restored
        product = await Product.findById(firstProduct.id)
        expect(product.stock).toBe(8)
        expect(product.reserved).toBe(0)
    })

    it("Successfully deletes sent order and restores stock to inventory", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order, secondProduct } = await global.createOrder(customer, OrderStatus.Sent)

        const response = await request(server)
            .delete(`/api/orders/admin/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))

        expect(response.status).toBe(200)

        // Verify stock was restored
        const product = await Product.findById(secondProduct.id)
        expect(product.stock).toBe(8)
    })

    it("Successfully deletes cancelled order with no stock changes", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order, firstProduct } = await global.createOrder(customer, OrderStatus.Cancelled)

        // Stock should not be reserved (already released)
        let product = await Product.findById(firstProduct.id)
        const initialStock = product.stock
        const initialReserved = product.reserved

        const response = await request(server)
            .delete(`/api/orders/admin/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))

        expect(response.status).toBe(200)

        // Verify stock unchanged
        product = await Product.findById(firstProduct.id)
        expect(product.stock).toBe(initialStock)
        expect(product.reserved).toBe(initialReserved)
    })

    it("Successfully deletes expired order with no stock changes", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order, secondProduct } = await global.createOrder(customer, OrderStatus.Expired)

        const response = await request(server)
            .delete(`/api/orders/admin/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))

        expect(response.status).toBe(200)

        // Verify order is deleted
        const deletedOrder = await Order.findById(order.id)
        expect(deletedOrder).toBeNull()
    })

    it("Deletes non-approved payment when hard deleting order", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order } = await global.createOrder(customer, OrderStatus.Pending)

        // Create a non-approved payment
        const payment = await global.createPayment(order); 

        payment.status = PaymentStatus.Pending; 

        order.paymentId = payment.id
        await order.save()

        const response = await request(server)
            .delete(`/api/orders/admin/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))

        expect(response.status).toBe(200)

        // Verify payment was deleted
        const deletedPayment = await Payment.findById(payment.id)
        expect(deletedPayment).toBeNull()
    })

    it("Preserves approved payment when deleting is blocked", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order } = await global.createOrder(customer, OrderStatus.Processing)

        const payment = await global.createPayment(order)
        order.paymentId = payment.id
        await order.save()

        await request(server)
            .delete(`/api/orders/admin/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(409)

        // Verify payment still exists
        const existingPayment = await Payment.findById(payment.id)
        expect(existingPayment).toBeDefined()
    })
})