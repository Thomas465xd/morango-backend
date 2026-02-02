import request from "supertest"
import server from "../../../server"
import Order, { OrderStatus } from "../../../models/Order";
import Product from "../../../models/Product";
import Payment, { PaymentStatus } from "../../../models/Payment";
import mongoose from "mongoose";

//? 📋 POST /api/orders/admin/archive/:orderId - Input Validation Tests
describe("POST /api/orders/admin/archive/:orderId - Input Validation", () => {
    it("Returns 403 Forbidden for non-admin user", async () => {
        const customer = await global.createUser(true, false); 
        const { order } = await global.createOrder()

        await request(server)
            .post(`/api/orders/admin/archive/${order.id}`)
            .set("Cookie", global.setCookie(customer.id))
            .expect(403)
    })

    it("Returns 400 Bad Request with invalid ObjectId", async () => {
        const admin = await global.createUser(true, true); 

        const response = await request(server)
            .post(`/api/orders/admin/archive/asdf`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)
            
        expect(response.body.errors[0].field).toEqual("orderId")
    })  
})

//? ✅ POST /api/orders/admin/archive/:orderId - archiveOrder request handler Tests
describe("archiveOrder request handler tests", () => {
    it("Returns 404 Not Found if order does not exist", async () => {
        const admin = await global.createUser(true, true); 
        const orderId = new mongoose.Types.ObjectId()

        const response = await request(server)
            .post(`/api/orders/admin/archive/${orderId}`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(404)

        expect(response.body.errors[0].message).toContain("no Encontrada")
    })

    it("200 OK if Successfully archives order with approved payment", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order } = await global.createOrder(customer, OrderStatus.Processing)

        // Create approved payment
        const payment = await global.createPayment(order)
        order.paymentId = payment.id
        await order.save()

        const response = await request(server)
            .post(`/api/orders/admin/archive/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // console.log(response.body)

        expect(response.body.order.archivedAt).toBeDefined()

        // Verify order still exists in database
        const archivedOrder = await Order.findById(order.id)
        expect(archivedOrder).toBeDefined()
        expect(archivedOrder.archivedAt).toBeDefined()

        // Verify payment is preserved
        const existingPayment = await Payment.findById(payment.id)
        expect(existingPayment).toBeDefined()
    })

    it("Successfully archives delivered order", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order } = await global.createOrder(customer, OrderStatus.Delivered)

        const response = await request(server)
            .post(`/api/orders/admin/archive/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))

        expect(response.status).toBe(200)
        expect(response.body.order.archivedAt).toBeDefined()

        // Verify order exists and is archived
        const archivedOrder = await Order.findById(order.id)
        expect(archivedOrder).toBeDefined()
        expect(archivedOrder.status).toBe(OrderStatus.Delivered) // Status unchanged
    })

    it("Successfully archives any order status", async () => {
        const admin = await global.createUser(true, true); 
        const statuses = [
            OrderStatus.Pending,
            OrderStatus.Processing,
            OrderStatus.Sent,
            OrderStatus.Cancelled,
            OrderStatus.Expired
        ]

        for (const status of statuses) {
            const customer = await global.createUser(true, false, `customer-${status}@test.com`)
            const { order } = await global.createOrder(customer, status)

            const response = await request(server)
                .post(`/api/orders/admin/archive/${order.id}`)
                .set("Cookie", global.setCookie(admin.id))
                .expect(200)
            
            const archivedOrder = await Order.findById(order.id)
            expect(archivedOrder.archivedAt).toBeDefined()
            expect(archivedOrder.status).toBe(status) // Status preserved
        }
    })

    it("Returns 409 Conflict when archiving already-archived order", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order } = await global.createOrder(customer, OrderStatus.Processing)

        // First archive
        await request(server)
            .post(`/api/orders/admin/archive/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // Try to archive again
        const response = await request(server)
            .post(`/api/orders/admin/archive/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(409)

        // console.log(response.body)

        expect(response.body.errors[0].message).toContain("ya ha sido archivada")
    })

    it("Sets correct archivedAt timestamp", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order } = await global.createOrder(customer, OrderStatus.Processing)

        const beforeArchive = new Date()

        const response = await request(server)
            .post(`/api/orders/admin/archive/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))

        const afterArchive = new Date()

        const archivedOrder = response.body.order
        const archiveTime = new Date(archivedOrder.archivedAt)

        expect(archiveTime.getTime()).toBeGreaterThanOrEqual(beforeArchive.getTime())
        expect(archiveTime.getTime()).toBeLessThanOrEqual(afterArchive.getTime())
    })

    it("Preserves order status when archiving", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const originalStatuses = [
            OrderStatus.Pending,
            OrderStatus.Processing,
            OrderStatus.Sent,
            OrderStatus.Delivered,
            OrderStatus.Cancelled
        ]

        for (const status of originalStatuses) {
            const { order } = await global.createOrder(customer, status)

            const response = await request(server)
                .post(`/api/orders/admin/archive/${order.id}`)
                .set("Cookie", global.setCookie(admin.id))

            expect(response.body.order.status).toBe(status)

            const dbOrder = await Order.findById(order.id)
            expect(dbOrder.status).toBe(status)
        }
    })

    it("Does not change stock when archiving", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order, firstProduct } = await global.createOrder(customer, OrderStatus.Processing)

        const productBefore = await Product.findById(firstProduct.id)
        const stockBefore = productBefore.stock
        const reservedBefore = productBefore.reserved

        await request(server)
            .post(`/api/orders/admin/archive/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))

        const productAfter = await Product.findById(firstProduct.id)
        expect(productAfter.stock).toBe(stockBefore)
        expect(productAfter.reserved).toBe(reservedBefore)
    })

    it("Preserves payment data when archiving", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order } = await global.createOrder(customer, OrderStatus.Processing)

        const payment = await global.createPayment(order)
        order.paymentId = payment.id
        await order.save()

        await request(server)
            .post(`/api/orders/admin/archive/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))

        // Verify payment still exists with same data
        const existingPayment = await Payment.findById(payment.id)
        expect(existingPayment).toBeDefined()
        expect(existingPayment.status).toBe(PaymentStatus.Approved)
        expect(existingPayment.mpPaymentId).toBeDefined()
    })

    it("Returns archived order in response body", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order } = await global.createOrder(customer, OrderStatus.Processing)

        const response = await request(server)
            .post(`/api/orders/admin/archive/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))

        expect(response.body.order).toBeDefined()
        expect(response.body.order.id).toBe(order.id)
        expect(response.body.order.archivedAt).toBeDefined()
    })
})

//? 🔄 Archive vs Delete Decision Tests
describe("Archive vs Delete Decision Logic", () => {
    it("Orders with approved payments cannot be deleted but can be archived", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order } = await global.createOrder(customer, OrderStatus.Processing)

        const payment = await global.createPayment(order)
        order.paymentId = payment.id
        await order.save()

        // Delete should fail
        const deleteResponse = await request(server)
            .delete(`/api/orders/admin/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))

        expect(deleteResponse.status).toBe(409)

        // Archive should succeed
        const archiveResponse = await request(server)
            .post(`/api/orders/admin/archive/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))

        expect(archiveResponse.status).toBe(200)

        // Verify data is preserved
        const archivedOrder = await Order.findById(order.id)
        const preservedPayment = await Payment.findById(payment.id)
        expect(archivedOrder).toBeDefined()
        expect(preservedPayment).toBeDefined()
    })

    it("Delivered orders cannot be deleted but can be archived", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")
        const { order } = await global.createOrder(customer, OrderStatus.Delivered)

        // Delete should fail
        const deleteResponse = await request(server)
            .delete(`/api/orders/admin/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))

        expect(deleteResponse.status).toBe(409)

        // Archive should succeed
        const archiveResponse = await request(server)
            .post(`/api/orders/admin/archive/${order.id}`)
            .set("Cookie", global.setCookie(admin.id))

        expect(archiveResponse.status).toBe(200)
    })

    it("Pending orders without payment can be deleted or archived", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@test.com")

        // Test deletion
        const { order: deleteOrder } = await global.createOrder(customer, OrderStatus.Pending)

        const deleteResponse = await request(server)
            .delete(`/api/orders/admin/${deleteOrder.id}`)
            .set("Cookie", global.setCookie(admin.id))

        expect(deleteResponse.status).toBe(200)

        // Test archiving
        const { order: archiveOrder } = await global.createOrder(customer, OrderStatus.Pending)
        const archiveResponse = await request(server)
            .post(`/api/orders/admin/archive/${archiveOrder.id}`)
            .set("Cookie", global.setCookie(admin.id))

        expect(archiveResponse.status).toBe(200)
    })
})
