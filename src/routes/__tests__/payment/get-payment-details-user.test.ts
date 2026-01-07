import request from "supertest"
import server from "../../../server"
import mongoose from "mongoose";
import { OrderStatus } from "../../../models/Order";

//? 📋 Input Validation Tests
describe("/api/payments/:paymentId Input Validation Tests", () => {
	it("Returns a 401 Unauthorized if user trying to process refund is not authenticated", async () => {
        const paymentId = new mongoose.Types.ObjectId; 

		await request(server)
			.get(`/api/payments/${paymentId}`)
			.send()
			.expect(401);
	});

	it("Returns a 400 with invalid paymentId provided in request params", async () => {
        const customer = await global.createUser(true, false); 

		const response = await request(server)
			.get(`/api/payments/asdf`)
			.send()
            .set("Cookie", global.setCookie(customer.id))
			.expect(400);

		expect(response.body.errors[0].field).toEqual("paymentId");
		expect(response.body.errors.length).toEqual(1); // for invalid orderId
	});
})

describe("getPaymentById Request Handler Tests", () => {
    it("Returns a 404 Payment Not found for non existing payment", async () => {
        const customer = await global.createUser(true, true); 
        const paymentId = new mongoose.Types.ObjectId; 

		const response = await request(server)
			.get(`/api/payments/${paymentId}`)
			.send()
            .set("Cookie", global.setCookie(customer.id))
			.expect(404);

        expect(response.body.errors[0].message).toEqual("Pago no Encontrado")
    })

    it("Returns a 404 Order Not found for non existing order", async () => {
        const customer = await global.createUser(true, true, "customer@customer.com"); 
        
        const { order } = await global.createOrder(); 

        const payment = await global.createPayment(order); 

        // Delete order to trigger error
        await order.deleteOne(); 

		const r2 = await request(server)
			.get(`/api/payments/${payment.id}`)
			.send()
            .set("Cookie", global.setCookie(customer.id))
			.expect(404);

        expect(r2.body.errors[0].message).toEqual("Orden no Encontrada")
    })

    it("Returns a 403 Forbidden for user trying to access another user order", async () => {
        const customer1 = await global.createUser(true, false, "customer1@customer1.com"); 
        const customer2 = await global.createUser(true, false, "customer2@customer2.com"); 

        const { order } = await global.createOrder(customer1); 

        const payment = await global.createPayment(order); 

		const response = await request(server)
			.get(`/api/payments/${payment.id}`)
			.send()
            .set("Cookie", global.setCookie(customer2.id))
			.expect(403);

        expect(response.body.errors[0].message).toEqual("No tienes permiso para ver este pago")
    })

    it("Returns 200 OK with correct payment info & order info", async () => {
        const customer = await global.createUser(true, true); 
        
        const { order } = await global.createOrder(customer); // Assign order to customer so it has his userId

        const payment = await global.createPayment(order); 

		const response = await request(server)
			.get(`/api/payments/${payment.id}`)
			.send()
            .set("Cookie", global.setCookie(customer.id))
			.expect(200);

        // console.log(response.body)

        // Order Info
        expect(response.body.orderStatus).toEqual(OrderStatus.Pending); 
        expect(response.body.trackingNumber).toEqual(order.trackingNumber)

        // Payment info
        expect(response.body.payment).toBeDefined(); 
        expect(response.body.payment.id).toEqual(payment.id);
    })
}); 