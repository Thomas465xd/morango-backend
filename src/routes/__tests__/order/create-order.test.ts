import request from "supertest"
import server from "../../../server"
import mongoose from "mongoose";
import Product from "../../../models/Product";
import Order, { OrderStatus } from "../../../models/Order";
import { expireOrdersJob } from "../../../cron/expireOrders";

//? 📋 Input Validation Tests
describe("POST /api/orders Input Validation Tests", () => {
    it("Returns a 400 with empty request body", async () => {
        await request(server)
            .post(`/api/orders`)
            .send({ })
            .expect(400)
    })

    it("Returns a 400 with fields that are empty", async () => {
        await request(server)
            .post(`/api/orders`)
            .send({ 
                items: [{
                    productId: "", 
                    quantity: ""
                }], 
            })
            .expect(400)
    })

    it("Returns a 400 with invalid items productId", async () => {
        const response = await request(server)
            .post(`/api/orders`)
            .send({ 
                items: [
                    {
                        productId: new mongoose.Types.ObjectId, 
                        quantity: 1
                    }, 
                    {
                        productId: "invalid_id", 
                        quantity: 2
                    }
                ], 
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('items[1].productId')
    })

    it("Returns a 400 with invalid items quantity (negative)", async () => {
        const response = await request(server)
            .post(`/api/orders`)
            .send({ 
                items: [
                    {
                        productId: new mongoose.Types.ObjectId, 
                        quantity: -1
                    }, 
                    {
                        productId: new mongoose.Types.ObjectId, 
                        quantity: -2
                    }
                ], 
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(2); 
        expect(response.body.errors[0].field).toEqual('items[0].quantity')
        expect(response.body.errors[1].field).toEqual('items[1].quantity')
    })
}) 

describe("createOrder Request Handler Tests", () => {
    it("Returns a 409 request conflict if some of the products don't exists or are not active", async () => {
        const user = await global.createUser(true, false); 
        
        const firstProduct = await global.createProduct(); 
        const secondProduct = await global.createProduct({ isActive: false }); 

        const response = await request(server)
            .post(`/api/orders`)
            .set("Cookie", global.setCookie(user.id))
            .send({ 
                items: [
                    {
                        productId: firstProduct.id, 
                        quantity: 1
                    },
                    { 
                        productId: secondProduct.id, 
                        quantity: 3
                    }, 
                    {
                        productId: new mongoose.Types.ObjectId, 
                        quantity: 2
                    }
                ], 
            })
            .expect(409)

        expect(response.body.errors[0].message).toEqual('Algunos productos no estan disponibles')
    })

    it("Returns a 409 request conflict if insufficient stock for some products", async () => {
        const user = await global.createUser(true, false); 
        
        const firstProduct = await global.createProduct({ stock: 5 }); 
        const secondProduct = await global.createProduct({ stock: 3 }); 
        const thirdProduct = await global.createProduct({ stock: 2 })

        const response = await request(server)
            .post(`/api/orders`)
            .set("Cookie", global.setCookie(user.id))
            .send({ 
                items: [
                    {
                        productId: firstProduct.id, 
                        quantity: 1
                    },
                    { 
                        productId: secondProduct.id, 
                        quantity: 3
                    }, 
                    {
                        productId: thirdProduct.id, 
                        quantity: 4
                    }
                ], 
            })
            .expect(409)

        expect(response.body.errors[0].message).toEqual('Stock insuficiente para algunos productos')
    })

    it("Returns a 201 if draft order is created successfully", async () => {
        const user = await global.createUser(true, false); 
        
        const firstProduct = await global.createProduct({ stock: 5 }); 
        const secondProduct = await global.createProduct({ stock: 3 }); 
        const thirdProduct = await global.createProduct({ stock: 2 })

        const response = await request(server)
            .post(`/api/orders`)
            .set("Cookie", global.setCookie(user.id))
            .send({ 
                items: [
                    {
                        productId: firstProduct.id, 
                        quantity: 1
                    },
                    { 
                        productId: secondProduct.id, 
                        quantity: 1
                    }, 
                    {
                        productId: thirdProduct.id, 
                        quantity: 1
                    }
                ], 
            })
            .expect(201)

        expect(response.body.order).toBeDefined(); 

        const order = await Order.findById(response.body.order.id).lean();

        expect(order.status).toEqual(OrderStatus.Pending); 
        expect(order.trackingNumber).toBeDefined(); 
        expect(order.stockReservedAt).toBeInstanceOf(Date);
        expect(order.stockReservedAt.getTime()).not.toBeNaN();
        expect(order.stockReservationExpiresAt).toBeInstanceOf(Date);
        expect(order.stockReservationExpiresAt.getTime()).not.toBeNaN();

        expect(
            order.stockReservationExpiresAt.getTime()
        ).toBeGreaterThan(order.stockReservedAt.getTime());
    })

    it('expires pending orders and releases stock', async () => {
        const user = await global.createUser(true, false); 
        const product = await global.createProduct({ stock: 5, basePrice: 10000 }); 

        // Log initial product state
        console.log('Initial product:', {
            id: product.id,
            stock: product.stock,
            reserved: product.reserved
        });

        const response = await request(server)
            .post(`/api/orders`)
            .set("Cookie", global.setCookie(user.id))
            .send({ 
                items: [
                    {
                        productId: product.id, 
                        quantity: 1
                    }
                ], 
            })
            .expect(201);

        // Get the order from response
        const orderData = response.body.order;
        console.log('Order created:', orderData);

        // Verify stock was reserved
        let productAfterOrder = await Product.findById(product._id);
        console.log('Product after order creation:', {
            stock: productAfterOrder.stock,
            reserved: productAfterOrder.reserved
        });

        expect(productAfterOrder.reserved).toBe(1);

        // Run expiration job (pass time in future to force expiration)
        const futureTime = Date.now() + (20 * 60000); // 20 minutes in future
        await expireOrdersJob(futureTime);

        // Find order by the ID from response
        const updatedOrder = await Order.findById(orderData.id);
        const updatedProduct = await Product.findById(product._id);

        console.log('After expiration:', {
            orderStatus: updatedOrder.status,
            productReserved: updatedProduct.reserved,
            productStock: updatedProduct.stock
        });

        expect(updatedOrder.status).toBe(OrderStatus.Expired);
        expect(updatedProduct.reserved).toBe(0);
        expect(updatedProduct.stock).toBe(5); // Stock unchanged
    });
})