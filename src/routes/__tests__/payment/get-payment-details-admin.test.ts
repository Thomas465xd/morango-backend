import request from "supertest"
import server from "../../../server"
import mongoose from "mongoose";
import { OrderStatus } from "../../../models/Order";

//? 📋 Input Validation Tests
describe("/api/payments/admin/:paymentId Input Validation Tests", () => {
	it("Returns a 403 Forbidden if user trying to process refund is not an admin", async () => {
        const customer = await global.createUser(true, false); 
        const paymentId = new mongoose.Types.ObjectId; 

        // Request with non admin user (customer)
		await request(server)
			.get(`/api/payments/admin/${paymentId}`)
			.send()
            .set("Cookie", global.setCookie(customer.id))
			.expect(403);

        // Request no auth whatsoever
		await request(server)
			.get(`/api/payments/admin/${paymentId}`)
			.send()
			.expect(403);
	});

	it("Returns a 400 with invalid paymentId provided in request params", async () => {
        const admin = await global.createUser(true, true); 

		const response = await request(server)
			.get(`/api/payments/admin/asdf`)
			.send()
            .set("Cookie", global.setCookie(admin.id))
			.expect(400);

		expect(response.body.errors[0].field).toEqual("paymentId");
		expect(response.body.errors.length).toEqual(1); // for invalid orderId
	});
})

describe("getPaymentByIdAdmin Request Handler Tests", () => {
    it("Returns a 404 Payment Not found for non existing payment", async () => {
        const admin = await global.createUser(true, true); 
        const paymentId = new mongoose.Types.ObjectId; 

		const response = await request(server)
			.get(`/api/payments/admin/${paymentId}`)
			.send()
            .set("Cookie", global.setCookie(admin.id))
			.expect(404);

        expect(response.body.errors[0].message).toEqual("Pago no Encontrado")
    })

    it("Returns a 404 Order Not found", async () => {
        const admin = await global.createUser(true, true); 
        
        const { order } = await global.createOrder(); 

        const payment = await global.createPayment(order); 

        // Delete order to trigger error
        await order.deleteOne(); 

		const response = await request(server)
			.get(`/api/payments/admin/${payment.id}`)
			.send()
            .set("Cookie", global.setCookie(admin.id))
			.expect(404);

        expect(response.body.errors[0].message).toEqual("Orden no Encontrada")
    })

    it("Returns 200 OK with correct payment info & order info", async () => {
        const admin = await global.createUser(true, true); 
        
        const { order } = await global.createOrder(); 

        const payment = await global.createPayment(order); 

		const response = await request(server)
			.get(`/api/payments/admin/${payment.id}`)
			.send()
            .set("Cookie", global.setCookie(admin.id))
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