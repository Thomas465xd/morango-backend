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
                customer: {
                    userId: "", 
                    email: "", 
                    name: "", 
                    surname: "", 
                    phone: "", 
                    isGuest: ""
                }, 
                shippingAddress: {
                    country: "", 
                    region: "", 
                    city: "", 
                    cityArea: "", 
                    street: "", 
                    reference: "", // Optional
                    zipCode: "" // Optional
                }, 
                items: [{
                    productId: "", 
                    quantity: ""
                }], 
                shipping: "", 
                saveData: ""
            })
            .expect(400)
    })

    it("Returns a 400 with invalid customer userId", async () => {
        const response = await request(server)
            .post(`/api/orders`)
            .send({ 
                customer: {
                    userId: "invalid_id", 
                    email: "test@test.com", 
                    name: "Thomas", 
                    surname: "Schrödinger", 
                    phone: "993128902", 
                    isGuest: true
                }, 
                shippingAddress: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago", 
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor Street 1234", 
                    reference: "", // Optional
                    zipCode: "" // Optional
                }, 
                items: [{
                    productId: new mongoose.Types.ObjectId, 
                    quantity: 1
                }], 
                shipping: 5990, 
                saveData: true
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('customer.userId')
    })

    it("Returns a 400 with invalid items productId", async () => {
        const response = await request(server)
            .post(`/api/orders`)
            .send({ 
                customer: {
                    userId: new mongoose.Types.ObjectId, 
                    email: "test@test.com", 
                    name: "Thomas", 
                    surname: "Schrödinger", 
                    phone: "993128902", 
                    isGuest: true
                }, 
                shippingAddress: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago", 
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor Street 1234", 
                    reference: "", // Optional
                    zipCode: "" // Optional
                }, 
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
                shipping: 5990, 
                saveData: true
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('items[1].productId')
    })

    it("Returns a 400 with invalid customer email", async () => {
        const response = await request(server)
            .post(`/api/orders`)
            .send({ 
                customer: {
                    userId: new mongoose.Types.ObjectId, 
                    email: "invalid_email", 
                    name: "Thomas", 
                    surname: "Schrödinger", 
                    phone: "993128902", 
                    isGuest: true
                }, 
                shippingAddress: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago", 
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor Street 1234", 
                    reference: "", // Optional
                    zipCode: "" // Optional
                }, 
                items: [
                    {
                        productId: new mongoose.Types.ObjectId, 
                        quantity: 1
                    }, 
                    {
                        productId: new mongoose.Types.ObjectId, 
                        quantity: 2
                    }
                ], 
                shipping: 5990, 
                saveData: true
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('customer.email')
    })

    it("Returns a 400 with invalid customer phone (not in +56 9 1234 5678 or 912346789 format)", async () => {
        const response = await request(server)
            .post(`/api/orders`)
            .send({ 
                customer: {
                    userId: new mongoose.Types.ObjectId, 
                    email: "test@test.com", 
                    name: "Thomas", 
                    surname: "Schrödinger", 
                    phone: "++1234++", 
                    isGuest: true
                }, 
                shippingAddress: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago", 
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor Street 1234", 
                    reference: "", // Optional
                    zipCode: "" // Optional
                }, 
                items: [
                    {
                        productId: new mongoose.Types.ObjectId, 
                        quantity: 1
                    }, 
                    {
                        productId: new mongoose.Types.ObjectId, 
                        quantity: 2
                    }
                ], 
                shipping: 5990, 
                saveData: true
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('customer.phone')
    })

    it("Returns a 400 with invalid isGuest provided (not boolean)", async () => {
        const response = await request(server)
            .post(`/api/orders`)
            .send({ 
                customer: {
                    userId: new mongoose.Types.ObjectId, 
                    email: "test@test.com", 
                    name: "Thomas", 
                    surname: "Schrödinger", 
                    phone: "912346789", 
                    isGuest: "yes"
                }, 
                shippingAddress: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago", 
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor Street 1234", 
                    reference: "", // Optional
                    zipCode: "" // Optional
                }, 
                items: [
                    {
                        productId: new mongoose.Types.ObjectId, 
                        quantity: 1
                    }, 
                    {
                        productId: new mongoose.Types.ObjectId, 
                        quantity: 2
                    }
                ], 
                shipping: 5990, 
                saveData: true
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('customer.isGuest')
    })

    it("Returns a 400 with invalid shippingAddress region (not inside Regions enum)", async () => {
        const response = await request(server)
            .post(`/api/orders`)
            .send({ 
                customer: {
                    userId: new mongoose.Types.ObjectId, 
                    email: "test@test.com", 
                    name: "Thomas", 
                    surname: "Schrödinger", 
                    phone: "912346789", 
                    isGuest: true
                }, 
                shippingAddress: {
                    country: "Chile", 
                    region: "Metropolitana", // Should be "Metropolitana de Santiago"
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor Street 1234", 
                    reference: "", // Optional
                    zipCode: "" // Optional
                }, 
                items: [
                    {
                        productId: new mongoose.Types.ObjectId, 
                        quantity: 1
                    }, 
                    {
                        productId: new mongoose.Types.ObjectId, 
                        quantity: 2
                    }
                ], 
                shipping: 5990, 
                saveData: true
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('shippingAddress.region')
    })

    it("Returns a 400 with invalid items quantity (negative)", async () => {
        const response = await request(server)
            .post(`/api/orders`)
            .send({ 
                customer: {
                    userId: new mongoose.Types.ObjectId, 
                    email: "test@test.com", 
                    name: "Thomas", 
                    surname: "Schrödinger", 
                    phone: "912346789", 
                    isGuest: true
                }, 
                shippingAddress: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago", // Should be "Metropolitana de Santiago"
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor Street 1234", 
                    reference: "", // Optional
                    zipCode: "" // Optional
                }, 
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
                shipping: 5990, 
                saveData: true
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(2); 
        expect(response.body.errors[0].field).toEqual('items[0].quantity')
        expect(response.body.errors[1].field).toEqual('items[1].quantity')
    })

    it("Returns a 400 with invalid shipping cost value (negative)", async () => {
        const response = await request(server)
            .post(`/api/orders`)
            .send({ 
                customer: {
                    userId: new mongoose.Types.ObjectId, 
                    email: "test@test.com", 
                    name: "Thomas", 
                    surname: "Schrödinger", 
                    phone: "912346789", 
                    isGuest: true
                }, 
                shippingAddress: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago",
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor Street 1234", 
                    reference: "", // Optional
                    zipCode: "" // Optional
                }, 
                items: [
                    {
                        productId: new mongoose.Types.ObjectId, 
                        quantity: 1
                    }, 
                    {
                        productId: new mongoose.Types.ObjectId, 
                        quantity: 2
                    }
                ], 
                shipping: -5990, 
                saveData: true
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('shipping')
    })

    it("Returns a 400 with invalid saveData (not boolean)", async () => {
        const response = await request(server)
            .post(`/api/orders`)
            .send({ 
                customer: {
                    userId: new mongoose.Types.ObjectId, 
                    email: "test@test.com", 
                    name: "Thomas", 
                    surname: "Schrödinger", 
                    phone: "912346789", 
                    isGuest: true
                }, 
                shippingAddress: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago",
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor Street 1234", 
                    reference: "", // Optional
                    zipCode: "" // Optional
                }, 
                items: [
                    {
                        productId: new mongoose.Types.ObjectId, 
                        quantity: 1
                    }, 
                    {
                        productId: new mongoose.Types.ObjectId, 
                        quantity: 2
                    }
                ], 
                shipping: 5990, 
                saveData: "yes"
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('saveData')
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
                customer: {
                    email: "test@test.com", 
                    name: "Thomas", 
                    surname: "Schrödinger", 
                    phone: "912346789", 
                    isGuest: true
                }, 
                shippingAddress: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago",
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor Street 1234", 
                    reference: "", // Optional
                    zipCode: "" // Optional
                }, 
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
                shipping: 5990, 
                saveData: true
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
                customer: {
                    email: "test@test.com", 
                    name: "Thomas", 
                    surname: "Schrödinger", 
                    phone: "912346789", 
                    isGuest: true
                }, 
                shippingAddress: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago",
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor Street 1234", 
                    reference: "", // Optional
                    zipCode: "" // Optional
                }, 
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
                shipping: 5990, 
                saveData: true
            })
            .expect(409)

        expect(response.body.errors[0].message).toEqual('Stock insuficiente para algunos productos')
    })

    // TODO: Test payment flow startup
    it("Returns a 201 if order is created successfully along with payment flow activation", async () => {
        const user = await global.createUser(true, false); 
        
        const firstProduct = await global.createProduct({ stock: 5 }); 
        const secondProduct = await global.createProduct({ stock: 3 }); 
        const thirdProduct = await global.createProduct({ stock: 2 })

        const response = await request(server)
            .post(`/api/orders`)
            .set("Cookie", global.setCookie(user.id))
            .send({ 
                customer: {
                    email: "test@test.com", 
                    name: "Thomas", 
                    surname: "Schrödinger", 
                    phone: "912346789", 
                    isGuest: true
                }, 
                shippingAddress: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago",
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor Street 1234", 
                    reference: "", // Optional
                    zipCode: "" // Optional
                }, 
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
                shipping: 5990, 
                saveData: true
            })
            .expect(201)

        expect(response.body.order).toBeDefined(); 

        const { 
            customer, 
            shippingAddress, 
            subtotal, 
            shipping, 
            total, 
            id
        } = response.body.order; 

        const order = await Order.findById(id).lean();
        console.log(order)

        expect(order.customer).toMatchObject({
            email: customer.email,
            name: customer.name,
            surname: customer.surname,
            phone: customer.phone,
            isGuest: customer.isGuest
        });

        expect(order.customer.userId.toString()).toBe(customer.userId);
        expect(order.shippingAddress).toEqual(shippingAddress);
        expect(order.status).toEqual(OrderStatus.Pending); 
        expect(order.trackingNumber).toBeDefined(); 
        expect(order.subtotal).toEqual(subtotal); 
        expect(order.shipping).toEqual(shipping);
        expect(order.total).toEqual(total); 
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
                customer: {
                    email: "test@test.com", 
                    name: "Thomas", 
                    surname: "Schrödinger", 
                    phone: "912346789"
                }, 
                shippingAddress: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago",
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor Street 1234", 
                    reference: "", // Optional
                    zipCode: "" // Optional
                }, 
                items: [
                    {
                        productId: product.id, 
                        quantity: 1
                    }
                ], 
                shipping: 5990,
                shippingMethod: "santiago", // ✅ Add this (required field)
                saveData: true
            })
            .expect(201);

        // Get the order from response
        const orderData = response.body.order;
        //console.log('Order created:', orderData);

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