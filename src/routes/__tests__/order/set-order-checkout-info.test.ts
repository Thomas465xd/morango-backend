import request from "supertest"
import server from "../../../server"
import mongoose from "mongoose";
import Product from "../../../models/Product";
import Order, { OrderStatus } from "../../../models/Order";
import { expireOrdersJob } from "../../../cron/expireOrders";

//? 📋 Input Validation Tests
describe("PATCH /api/orders/checkout/:orderId Input Validation Tests", () => {
    it("Returns a 400 with invalid :orderId in request params", async () => {
        const r1 = await request(server)
            .patch(`/api/orders/checkout/asdf`)
            .send({ })
            .expect(400)

        expect(r1.body.errors[0].field).toEqual("orderId")
    })

    it("Returns a 400 with empty request body", async () => {
        const orderId = new mongoose.Types.ObjectId 

        await request(server)
            .patch(`/api/orders/checkout/${orderId}`)
            .send({ })
            .expect(400)
    })

    it("Returns a 400 with fields that are empty", async () => {
        const orderId = new mongoose.Types.ObjectId; 

        await request(server)
            .patch(`/api/orders/checkout/${orderId}`)
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
                shipping: "", 
                saveData: ""
            })
            .expect(400)
    })

    it("Returns a 400 with invalid customer userId", async () => {
        const orderId = new mongoose.Types.ObjectId; 

        const response = await request(server)
            .patch(`/api/orders/checkout/${orderId}`)
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
                shipping: 5990, 
                shippingMethod: "RM",
                saveData: true
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('customer.userId')
    })

    it("Returns a 400 with invalid customer email", async () => {
        const orderId = new mongoose.Types.ObjectId; 

        const response = await request(server)
            .patch(`/api/orders/checkout/${orderId}`)
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
                shipping: 5990, 
                shippingMethod: "RM",
                saveData: true
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('customer.email')
    })

    it("Returns a 400 with invalid customer phone (not in +56 9 1234 5678 or 912346789 format)", async () => {
        const orderId = new mongoose.Types.ObjectId; 

        const response = await request(server)
            .patch(`/api/orders/checkout/${orderId}`)
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
                shipping: 5990, 
                shippingMethod: "RM",
                saveData: true
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('customer.phone')
    })

    it("Returns a 400 with invalid isGuest provided (not boolean)", async () => {
        const orderId = new mongoose.Types.ObjectId; 
    
        const response = await request(server)
            .patch(`/api/orders/checkout/${orderId}`)
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
                shipping: 5990, 
                shippingMethod: "RM",
                saveData: true
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('customer.isGuest')
    })

    it("Returns a 400 with invalid shippingAddress region (not inside Regions enum)", async () => {
        const orderId = new mongoose.Types.ObjectId; 

        const response = await request(server)
            .patch(`/api/orders/checkout/${orderId}`)
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
                shipping: 5990, 
                shippingMethod: "RM",
                saveData: true
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('shippingAddress.region')
    })

    it("Returns a 400 with invalid shipping cost value (negative)", async () => {
        const orderId = new mongoose.Types.ObjectId; 

        const response = await request(server)
            .patch(`/api/orders/checkout/${orderId}`)
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
                shipping: -5990, 
                shippingMethod: "RM", 
                saveData: true
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('shipping')
    })

    it("Returns a 400 with invalid shipping Method value (not a string)", async () => {
        const orderId = new mongoose.Types.ObjectId; 

        const response = await request(server)
            .patch(`/api/orders/checkout/${orderId}`)
            .send({ 
                customer: {
                    userId: new mongoose.Types.ObjectId, 
                    email: "customer@customer.com", 
                    name: "John", 
                    surname: "Doe", 
                    phone: "989019321", 
                    isGuest: true
                }, 
                shippingAddress: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago",
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "My Street 123", 
                    reference: "In front of the big mountain", // Optional
                    zipCode: "7007000" // Optional
                }, 
                shipping: 5990, 
                shippingMethod: 1, 
                saveData: true
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('shippingMethod')
    })

    it("Returns a 400 with invalid saveData (not boolean)", async () => {
        const orderId = new mongoose.Types.ObjectId; 

        const response = await request(server)
            .patch(`/api/orders/checkout/${orderId}`)
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
                shipping: 5990, 
                shippingMethod: "RM",
                saveData: "yes"
            })
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual('saveData')
    })
}) 

describe("setOrderCheckoutInfo Request Handler Tests", () => {
    it("Returns a 404 Order Not Found if, well, order not found", async () => {
        const orderId = new mongoose.Types.ObjectId; 

        await request(server)
            .patch(`/api/orders/checkout/${orderId}`)
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
                shipping: 5990, 
                shippingMethod: "RM",
                saveData: false
            })
            .expect(404)
    })

    it("Returns a 409 Request Conflict if Order is in a state other than Pending", async () => {
        const customer = await global.createUser(true); 
        const { order } = await global.createOrder(customer, OrderStatus.Processing)

        await request(server)
            .patch(`/api/orders/checkout/${order.id}`)
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
                shipping: 5990, 
                shippingMethod: "RM",
                saveData: false
            })
            .expect(409)
    })

    it("Returns a 409 Request Conflict if Order is already expired", async () => {
        const { order } = await global.createOrder()

        // Run expiration job (pass time in future to force expiration)
        const futureTime = Date.now() + (20 * 60000); // 20 minutes in future
            await expireOrdersJob(futureTime);

        await request(server)
            .patch(`/api/orders/checkout/${order.id}`)
            .send({ 
                customer: { 
                    email: "customer@customer.com", 
                    name: "John", 
                    surname: "Doe", 
                    phone: "989019321", 
                    isGuest: true
                }, 
                shippingAddress: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago",
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "My Street 123", 
                    reference: "In front of the big mountain", // Optional
                    zipCode: "7007000" // Optional
                }, 
                shipping: 5990, 
                shippingMethod: "RM",
                saveData: false
            })
            .expect(409)
    })

    it("Returns a 200 OK if Order is successfully updated and is ready for payment", async () => {
        const user = await global.createUser(true, false); 
        const product = await global.createProduct({ stock: 5, basePrice: 10000 }); 

        const createOrderResponse = await request(server)
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

        const orderId = createOrderResponse.body.order.id; 
        const order = await Order.findById(orderId); 

        expect(order.customer.email).not.toBeDefined(); 
        expect(order.shippingAddress.street).not.toBeDefined(); 

        expect(order.shipping).toEqual(0); 
        expect(order.shippingMethod).toEqual("Por Definir...")

        const response = await request(server)
            .patch(`/api/orders/checkout/${orderId}`)
            .send({ 
                customer: { 
                    email: "customer@customer.com", 
                    name: "John", 
                    surname: "Doe", 
                    phone: "989019321", 
                    isGuest: true
                }, 
                shippingAddress: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago",
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "My Street 123", 
                    reference: "In front of the big mountain", // Optional
                    zipCode: "7007000" // Optional
                },
                shipping: 7990, 
                shippingMethod: "RM",
                saveData: false
            })
            .expect(200)

        const updatedOrder = await Order.findById(orderId); 

        // expect total to have been updated with the shipping price
        expect(updatedOrder.subtotal).toEqual(response.body.order.subtotal); 
        expect(updatedOrder.total).toEqual(response.body.order.total)

        expect(updatedOrder.shipping).toEqual(7990); 
        expect(updatedOrder.shippingMethod).toEqual("RM"); 

        expect(updatedOrder.customer.email).toEqual("customer@customer.com")
        expect(updatedOrder.customer.name).toEqual("John")
        expect(updatedOrder.customer.surname).toEqual("Doe")
        expect(updatedOrder.customer.phone).toEqual("989019321")
        expect(updatedOrder.customer.isGuest).toEqual(true); 

        expect(updatedOrder.shippingAddress.country).toEqual("Chile")
        expect(updatedOrder.shippingAddress.region).toEqual("Metropolitana de Santiago")
        expect(updatedOrder.shippingAddress.city).toEqual("Santiago")
        expect(updatedOrder.shippingAddress.cityArea).toEqual("Las Condes")
        expect(updatedOrder.shippingAddress.street).toEqual("My Street 123"); 
        expect(updatedOrder.shippingAddress.reference).toEqual("In front of the big mountain")
        expect(updatedOrder.shippingAddress.zipCode).toEqual("7007000"); 
    })
})