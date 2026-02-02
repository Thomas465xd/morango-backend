jest.mock("../../../config/mercadopago", () => ({
	preferenceClient: {
		create: jest.fn(),
	},
	paymentClient: {
		get: jest.fn(),
	},
    refundClient: {
        create: jest.fn(), 
    }
}));

import request from "supertest"
import server from "../../../server"
import Payment, { PaymentStatus } from "../../../models/Payment";
import Order, { OrderStatus } from "../../../models/Order";
import { paymentClient, refundClient } from "../../../config/mercadopago";
import Product from "../../../models/Product";
import { expireOrdersJob } from "../../../cron/expireOrders";
import resend from "../../../config/resend";

//? 📋 Input Validation Tests
// describe("Input Validation Tests", () => {
//     it("Returns a 400 with malformed token", async () => {
//         await request(server)
//             .post(`/api/payments/create-preference`)
//             .send({})
//             .expect(400)
//     })
// })

describe("mpWebhook Request Handler Tests", () => {
    it("handles missing order gracefully and does nothing", async () => {
        const { order } = await global.createOrder();
        await global.createPayment(order);

        (paymentClient.get as jest.Mock).mockResolvedValue({
            id: "mp-payment-id",
            status: "approved",
            external_reference: order.trackingNumber,
        });

        await order.deleteOne();

        await request(server)
            .post("/api/payments/webhook")
            .send({
                type: "payment",
                data: { id: "mp-payment-id" },
            })
            .expect(200);

        //! Side effects
        expect(refundClient.create).not.toHaveBeenCalled(); 
        expect(resend.emails.send).not.toHaveBeenCalled();  // shouldn't have sent any payment status email
    });

    it("handles missing payment gracefully", async () => {
        const { order } = await global.createOrder();
        const payment = await global.createPayment(order);

        (paymentClient.get as jest.Mock).mockResolvedValue({
            id: "mp-payment-id",
            status: "approved",
            external_reference: order.trackingNumber,
        });

        await payment.deleteOne();

        await request(server)
            .post("/api/payments/webhook")
            .send({
                type: "payment",
                data: { id: "mp-payment-id" },
            })
            .expect(200);

        expect(refundClient.create).not.toHaveBeenCalled();
        expect(resend.emails.send).not.toHaveBeenCalled();
    });

	it("Tests idempotency for an already approved payment trying to be processed. Returns 200 OK. ", async () => {
		const { order } = await global.createOrder(); // Pending order
		const payment = await global.createPayment(order);

        payment.status = PaymentStatus.Approved; 
        await payment.save(); 

		(paymentClient.get as jest.Mock).mockResolvedValue({
			id: "mp-payment-id",
			status: "approved",
			external_reference: order.trackingNumber,
			payment_method_id: "visa",
		});

		await request(server)
			.post("/api/payments/webhook")
			.send({
				type: "payment",
				data: { id: "mp-payment-id" },
			})
			.expect(200);

        //! Side effects
        expect(refundClient.create).not.toHaveBeenCalled(); 
        expect(resend.emails.send).not.toHaveBeenCalled();  // shouldn't have sent any payment status email
	});

	it("200 OK if it processes approved payment and moves order to Processing", async () => {
		const { order, firstProduct } = await global.createOrder(); // Pending order
		const payment = await global.createPayment(order);

        const reservedStock = await Product.findById(firstProduct.id); 
        expect(reservedStock.reserved).toEqual(1); 
        expect(reservedStock.stock).toEqual(8); 

		(paymentClient.get as jest.Mock).mockResolvedValue({
			id: "mp-payment-id",
			status: "approved",
			external_reference: order.trackingNumber,
			payment_method_id: "visa",
		});

		await request(server)
			.post("/api/payments/webhook")
			.send({
				type: "payment",
				data: { id: "mp-payment-id" },
			})
			.expect(200);

        // Expect resend to have been called two times, one for Approved Payment email and one for NewOrder email sent to admin
        expect(resend.emails.send).toHaveBeenCalledTimes(2); 

        const soldStock = await Product.findById(firstProduct.id); 
        expect(soldStock.reserved).toEqual(0); 
        expect(soldStock.stock).toEqual(7); 

		const updatedOrder = await Order.findById(order.id);
		const updatedPayment = await Payment.findById(payment.id);

		expect(updatedOrder).not.toBeNull();
		expect(updatedPayment).not.toBeNull();

		expect(updatedOrder.status).toBe(OrderStatus.Processing);

		expect(updatedPayment.status).toBe(PaymentStatus.Approved);
		expect(updatedPayment.mpPaymentId).toBe("mp-payment-id");
        expect(updatedPayment.mpStatus).toBe("approved")
        expect(updatedPayment.paymentMethod).toBe("visa")
	});

    it("200 OK response and handles rejected payment while setting payment.rejectionReason & sending payment failed email", async () => {
        const { order } = await global.createOrder();

		const payment = await global.createPayment(order);

		(paymentClient.get as jest.Mock).mockResolvedValue({
			id: "mp-payment-id",
			status: "rejected",
            status_detail: "cc_rejected_insufficient_amount", // Should be mapped to "Fondos insufiecientes"
			external_reference: order.trackingNumber,
		});

        await request(server)
            .post("/api/payments/webhook")
            .send({
                type: "payment",
                data: { id: "mp-payment-id" }
            })
            .expect(200);

        // Expect resend to have been called one time for Rejected Payment email
        expect(resend.emails.send).toHaveBeenCalledTimes(1); 

        const updatedPayment = await Payment.findById(payment.id);
        
		expect(updatedPayment).not.toBeNull();

		expect(updatedPayment.status).toBe(PaymentStatus.Rejected);
		expect(updatedPayment.mpPaymentId).toBe("mp-payment-id");
        expect(updatedPayment.mpStatus).toBe("rejected")

        // Validate rejection reason 
        expect(updatedPayment.rejectionReason).toBe("Fondos insuficientes")
    });

    //! Important tests
    it("Handles gracefully Resource Gone if late payment for expired order and refund process", async () => {
        const { order, firstProduct } = await global.createOrder();

		const payment = await global.createPayment(order, "mp-payment-id");
        
        // Run expiration job (pass time in future to force expiration)
        const futureTime =
            order.stockReservationExpiresAt.getTime() + 1000;
        await expireOrdersJob(futureTime);

        const reservedStock = await Product.findById(firstProduct.id); 
        expect(reservedStock.reserved).toEqual(0); // Should be 0 since order expired
        expect(reservedStock.stock).toEqual(8); 
        

		(paymentClient.get as jest.Mock).mockResolvedValue({
			id: "mp-payment-id",
			status: "approved",
			external_reference: order.trackingNumber,
			payment_method_id: "visa",
		});


        await request(server)
            .post("/api/payments/webhook")
            .send({
                type: "payment",
                data: { id: "mp-payment-id" }
            })
            .expect(200);

        // Expect resend to have been called one time for refund email
        expect(resend.emails.send).toHaveBeenCalledTimes(1); 

        // Check refund was called
        expect(refundClient.create).toHaveBeenCalledTimes(1); 
        expect(refundClient.create).toHaveBeenCalledWith(
            expect.objectContaining({
                payment_id: payment.mpPaymentId,
            })
        );

        const soldStock = await Product.findById(firstProduct.id); 
        expect(soldStock.reserved).toBe(0);
        expect(soldStock.stock).toBe(8); 

		const updatedOrder = await Order.findById(order.id);
		const updatedPayment = await Payment.findById(payment.id);

		expect(updatedOrder).not.toBeNull();
		expect(updatedPayment).not.toBeNull();

		expect(updatedOrder.status).toBe(OrderStatus.Expired);

		expect(updatedPayment.status).toBe(PaymentStatus.Refunded);
		expect(updatedPayment.mpPaymentId).toBe("mp-payment-id");
        expect(updatedPayment.mpStatus).toBe("refunded")
        expect(updatedPayment.paymentMethod).toBe("visa")
    });
})