import request from "supertest"
import server from "../../../server"
import { generateConfirmationToken } from "../../../utils/jwt"
import mongoose from "mongoose"
import User from "../../../models/User"

//? 📋 Input Validation Tests
describe("/api/auth/admin/:userId Input Validation Tests", () => {
    it("Returns a 403 Forbidden for non admin or not auth user trying to search user", async () => {
        const customer = await global.createUser(true, false); 
        const userId = new mongoose.Types.ObjectId; 

        await request(server)
            .get(`/api/auth/admin/${userId}`)
            .send()
            .set("Cookie", global.setCookie(customer.id))
            .expect(403)

        await request(server)
            .get(`/api/auth/admin/${userId}`)
            .send()
            .expect(403)
    })

    it("Returns a 400 with invalid userId request param", async () => {
        const admin = await global.createUser(true, true); 

        await request(server)
            .get(`/api/auth/admin/asdf`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)
    })
})

describe("getUserById Request Handler Tests", () => {
    it("Returns a 404 User not found for non existing user", async () => {
        const admin = await global.createUser(true, true);
        const customerId = new mongoose.Types.ObjectId; 

        await request(server)
            .get(`/api/auth/admin/${customerId}`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(404)
    })

    it("Returns a 200 OK if user is successfully retrieved", async () => {
        const admin = await global.createUser(true, true);
        const customer = await global.createUser(true, false, "customer@customer.com");  

        const response = await request(server)
            .get(`/api/auth/admin/${customer.id}`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        expect(response.body.id).toEqual(customer.id)
        expect(response.body.email).toEqual("customer@customer.com")
    })
})