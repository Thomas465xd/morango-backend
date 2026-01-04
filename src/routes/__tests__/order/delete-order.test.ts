import request from "supertest"
import server from "../../../server"
import Product from "../../../models/Product";
import mongoose from "mongoose";
import Order, { OrderStatus } from "../../../models/Order";

//? 📋 Input Validation Tests
describe("DELETE /api/orders/admin/:orderId Input Validation Tests", () => {
    it("Returns a 403 Forbidden for non admin user trying to access", async () => {
        const customer = await global.createUser(true, false); 
        const { order } = await global.createOrder(); 

        await request(server)
            .delete(`/api/orders/admin/${order.id}`)
            .send()
            .set("Cookie", global.setCookie(customer.id))
            .expect(403)
    })

    it("Returns a 400 with invalid :orderId param", async () => {
        const admin = await global.createUser(true, true); 

        await request(server)
            .delete(`/api/orders/admin/asdf`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)
    })
})

describe("deleteProduct Request Handler Tests", () => {
    it("Returns a 404 Not Found if order trying to be deleted does not exist", async () => {
        const admin = await global.createUser(true, true); 
        const orderId = new mongoose.Types.ObjectId; 

        await request(server)
            .delete(`/api/orders/admin/${orderId}`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(404)
    })

    it("Returns a 200 OK if pending or processing order is successfully deleted & check Stocks were released", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@customer.com")

        // Stock should only release on ordes with Pending or Processing Statuses
        const { order, secondProduct } = await global.createOrder(customer, OrderStatus.Pending); 

        // Validate stock is actually reserved
        const checkReservedStock = await Product.findById(secondProduct.id); 
        expect(checkReservedStock.reserved).toEqual(1); 

        // This request should release stock
        await request(server)
            .delete(`/api/orders/admin/${order.id}`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        const checkReleasedStock = await Product.findById(secondProduct.id);
        expect(checkReleasedStock.reserved).toEqual(0); 

        expect(await Order.findById(order.id)).toBeNull(); 
    })

    it("Returns a 200 OK if processing or sent order is successfully deleted & check Stocks are added back to inventory", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@customer.com")

        // Reserved Stock should only release in an order with Pending Status
        // If order trying to be deleted is cancelled or expired, then stock has probably been released

        //* If want to test the other case uncomment 
        const { order, secondProduct } = await global.createOrder(customer, OrderStatus.Processing); 
        // const { order, secondProduct } = await global.createOrder(customer, OrderStatus.Sent); 

        // Validate stock is actually sold
        const checkReservedStock = await Product.findById(secondProduct.id); 
        expect(checkReservedStock.reserved).toEqual(0); // Reserved should be 0 since stock is sold
        expect(checkReservedStock.stock).toEqual(7) // Stock shouldn't be 8 since 1 was sold
        
        // This request should release reserved stock
        await request(server)
            .delete(`/api/orders/admin/${order.id}`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        const checkReleasedStock = await Product.findById(secondProduct.id);
        expect(checkReleasedStock.reserved).toEqual(0); // stays the same
        expect(checkReleasedStock.stock).toEqual(8); // Re-adds sold stock

        expect(await Order.findById(order.id)).toBeNull(); 
    })

    it("Returns a 200 OK if expired or cancelled order is successfully deleted & check reserved and stocks stay the same (since cancelled and expired already managed)", async () => {
        const admin = await global.createUser(true, true); 
        const customer = await global.createUser(true, false, "customer@customer.com")

        // Reserved Stock should only release in an order with Pending Status
        // If order trying to be deleted is cancelled or expired, then stock has probably been released

        //* If want to test the other case uncomment 
        const { order, secondProduct } = await global.createOrder(customer, OrderStatus.Cancelled); 
        // const { order, secondProduct } = await global.createOrder(customer, OrderStatus.Expired); 

        // Validate stock is actually reserved
        const checkReservedStock = await Product.findById(secondProduct.id); 
        expect(checkReservedStock.reserved).toEqual(0); // Reserved should be 0 since order is cancelled
        expect(checkReservedStock.stock).toEqual(8) // Stays the same
        
        // This request should release reserved stock
        await request(server)
            .delete(`/api/orders/admin/${order.id}`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        const checkReleasedStock = await Product.findById(secondProduct.id);
        expect(checkReleasedStock.reserved).toEqual(0); // stays the same
        expect(checkReleasedStock.stock).toEqual(8); // Stays the same

        expect(await Order.findById(order.id)).toBeNull(); 
    })
})