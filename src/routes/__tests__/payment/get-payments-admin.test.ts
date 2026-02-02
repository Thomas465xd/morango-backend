import request from "supertest"
import server from "../../../server"
import { OrderStatus } from "../../../models/Order";
import { PaymentStatus } from "../../../models/Payment";

//? 📋 Input Validation Tests
describe("/api/payments/admin Input Validation Tests", () => {
	it("Returns a 403 Forbidden if user trying to process refund is not an admin", async () => {
        const customer = await global.createUser(true, false); 

        // Request with non admin user (customer)
		await request(server)
			.get(`/api/payments/admin`)
			.send()
            .set("Cookie", global.setCookie(customer.id))
			.expect(403);

        // Request no auth whatsoever 
		await request(server)
			.get(`/api/payments/admin`)
			.send()
			.expect(403);
	});

	it("Returns a 400 with invalid status query param (Not inside PaymentStatus values)", async () => {
        const admin = await global.createUser(true, true); 

		const r1 = await request(server)
			.get(`/api/payments/admin?status=`)
			.send()
            .set("Cookie", global.setCookie(admin.id))
			.expect(400);

        const r2 = await request(server)
			.get(`/api/payments/admin?status=pendiente`) // should be pending
			.send()
            .set("Cookie", global.setCookie(admin.id))
			.expect(400);

		expect(r1.body.errors[0].field).toEqual("status");
		expect(r1.body.errors.length).toEqual(2); // for invalid orderId

		expect(r2.body.errors[0].field).toEqual("status");
		expect(r2.body.errors.length).toEqual(1); // for invalid orderId
	});

	it("Returns a 400 with invalid search query param (length passing 50 characters)", async () => {
        const admin = await global.createUser(true, true); 

        const longSearch = 'a'.repeat(51);

        const r1 = await request(server)
            .get(`/api/payments/admin?search=${longSearch}`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(400);

        expect(r1.body.errors).toHaveLength(1);
        expect(r1.body.errors[0].field).toEqual('search');
	});

    it("Returns a 400 with invalid startDate query param (invalid ISO string)", async () => {
        const admin = await global.createUser(true, true); 
        
        const { order } = await global.createOrder(); 

        await global.createPayment(order)

        const response = await request(server)
            .get(`/api/payments/admin?startDate=12-12-2026`)
            .set("Cookie", global.setCookie(admin.id))
            .send()
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("startDate"); 
    }) 

    it("Returns a 400 with invalid endDate field (invalid ISO string)", async () => {
        const admin = await global.createUser(true, true); 
        
        const { order } = await global.createOrder(); 
        
        await global.createPayment(order)

        const response = await request(server)
            .get(`/api/payments/admin?endDate=28-12-2026`)
            .set("Cookie", global.setCookie(admin.id))
            .send()
            .expect(400)

        expect(response.body.errors.length).toEqual(1); 
        expect(response.body.errors[0].field).toEqual("endDate"); 
    }) 

    it("Returns a 400 with invalid startDate and endDate range", async () => {
        const admin = await global.createUser(true, true); 

        await global.createOrder(); 

        const response = await request(server)
            .get(`/api/payments/admin?startDate=2026-12-12&endDate=2026-12-6`) // strt date is more in the future than end date
            .set("Cookie", global.setCookie(admin.id))
            .send()
            .expect(400)

        expect(response.body.errors.length).toEqual(2); 
        expect(response.body.errors[0].field).toEqual("endDate"); 
    })

    it("Returns a 400 if ?sortOrder or ?sortBy query param is invalid (not asc or desc and not 'date' or 'amount')", async () => {
        const admin = await global.createUser(true, true); 

        const { order } = await global.createOrder(); 
        
        await global.createPayment(order)

        const r1 = await request(server)
            .get(`/api/payments/admin?sortOrder=asdf`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)

        const r2 = await request(server)
            .get(`/api/payments/admin?sortOrder=asc&sortBy=createdAt`) // should be sortBy=date or amount
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)

        expect(r1.body.errors[0].field).toEqual('sortOrder')
        expect(r1.body.errors.length).toEqual(1)

        expect(r2.body.errors[0].field).toEqual('sortBy')
        expect(r2.body.errors.length).toEqual(1)
    })
})

describe("getPaymentsAdmin Request Handler Tests", () => {
    it("Returns 200 OK with payments info, pagination data and filters in response", async () => {
        const admin = await global.createUser(true, true); 

        const customer1 = await global.createUser(true, false, "customer1@customer1.com"); 
        const customer2 = await global.createUser(true, false, "customer2@customer2.com");

        const day1 = new Date("2026-12-01T10:00:00.000Z");
        const day2 = new Date("2026-12-02T10:00:00.000Z");
        const day3 = new Date("2026-12-03T10:00:00.000Z");

        
        const { order: order1 } = await global.createOrder(customer1, OrderStatus.Pending, day1); 
        const { order: order2 } = await global.createOrder(customer1, OrderStatus.Pending, day2); 
        const { order: order3 } = await global.createOrder(customer2, OrderStatus.Processing, day3); 

        const payment1 = await global.createPayment(order1, "first-payment"); 
        const payment2 = await global.createPayment(order2, "second-payment"); 
        const payment3 = await global.createPayment(order3, "last-payment"); 

        payment3.status = PaymentStatus.Approved; // change status for processed order payment
        await payment3.save();

        // Filters
        const status = PaymentStatus.Pending; 
        const startDate = "2026-12-02T10:00:00.000Z"; 
        const endDate = "2026-12-03T10:00:00.000Z"; 
        const sortBy = "date"; 
        const sortOrder = "desc"; 
        const searchEmail = "customer2@customer2.com"; 
        const searchTracking = order3.trackingNumber; 

        // Test status filter
        const r1 = await request(server)
            .get(`/api/payments/admin?page=1&perPage=5&status=${status}`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // Test sorting
        const r2 = await request(server)
            .get(`/api/payments/admin?page=1&perPage=5&sortBy=${sortBy}&sortOrder=${sortOrder}`) // asc means orders will be sorted from first one created to last one.
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // Test Date ranges
        // Between
        const r3 = await request(server)
            .get(`/api/payments/admin?page=1&perPage=5&startDate=${startDate}&endDate=${endDate}`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // Starting from...
        const r4 = await request(server)
            .get(`/api/payments/admin?page=1&perPage=5&startDate=${startDate}`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // Before...
        const r5 = await request(server)
            .get(`/api/payments/admin?page=1&perPage=5&endDate=2026-12-02T23:59:59.999Z`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // Test search param with email
        const r6 = await request(server)
            .get(`/api/payments/admin?page=1&perPage=5&search=${searchEmail}`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // Test search param with order tracking number
        const r7 = await request(server)
            .get(`/api/payments/admin?page=1&perPage=5&search=${searchTracking}`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // Test status filter
        expect(r1.body.payments).toBeDefined(); 
        expect(r1.body.payments.length).toEqual(2); // Two payments are set as pending

        expect(r1.body.payments[0].status).toEqual("pending")
        expect(r1.body.payments[1].status).toEqual("pending")

        expect(r1.body.totalPayments).toEqual(2); 
        expect(r1.body.totalPages).toEqual(1); 
        expect(r1.body.perPage).toEqual(5); 
        expect(r1.body.currentPage).toEqual(1);
        expect(r1.body.filters.status).toEqual(PaymentStatus.Pending); 
        expect(r1.body.filters.sortBy).toEqual('createdAt')
        expect(r1.body.filters.sortOrder).toEqual(-1);   

        //* Test date related params

        // Test sorting (sortOrder & sortBy)
        expect(r2.body.payments).toHaveLength(3);

        expect(r2.body.payments[0].id).toEqual(payment3.id);
        expect(r2.body.payments[1].id).toEqual(payment2.id);
        expect(r2.body.payments[2].id).toEqual(payment1.id);

        expect(r2.body.filters.sortBy).toEqual("date");
        expect(r2.body.filters.sortOrder).toEqual(-1);

        // Test date ranges (between)
        expect(r3.body.payments).toHaveLength(2);

        expect(r3.body.payments[0].id).toEqual(payment3.id);
        expect(r3.body.payments[1].id).toEqual(payment2.id);

        expect(r3.body.filters.startDate).toEqual(startDate);
        expect(r3.body.filters.endDate).toEqual(endDate);
        expect(r3.body.filters.sortBy).toEqual("createdAt");
        expect(r3.body.filters.sortOrder).toEqual(-1);

        // Test starting from 2026-12-02 | should return payment2 and 3
        expect(r4.body.payments).toHaveLength(2);

        expect(r4.body.payments[0].id).toEqual(payment3.id);
        expect(r4.body.payments[1].id).toEqual(payment2.id);

        expect(r4.body.filters.startDate).toEqual(startDate);
        expect(r4.body.filters.endDate).toBeNull();

        // Test before 2026-12-02T23:59:59.999Z edge case | should return payment1 and 2
        expect(r5.body.payments).toHaveLength(2);

        // See payments are returned in desc order (from newest to oldest)
        expect(r5.body.payments[0].id).toEqual(payment2.id); 
        expect(r5.body.payments[1].id).toEqual(payment1.id);

        expect(r5.body.filters.startDate).toBeNull(); 
        expect(r5.body.filters.endDate).toEqual("2026-12-02T23:59:59.999Z");

        // Test search param (email)
        expect(r6.body.payments).toHaveLength(1); 

        expect(r6.body.payments[0].status).toEqual(PaymentStatus.Approved)

        expect(r6.body.filters.search).toEqual("customer2@customer2.com")

        // Test search param (trackingNumber)
        expect(r7.body.payments).toHaveLength(1); 

        expect(r7.body.payments[0].status).toEqual(PaymentStatus.Approved)

        expect(r7.body.filters.search).toEqual(order3.trackingNumber)
    })
}); 