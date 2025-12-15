import request from "supertest"
import server from "../../../server"
import resend from "../../../config/resend"

//? 📋 Input Validation Tests
describe("Input Validation Tests", () => {
    it("Returns a 400 with an empty email", async () => {
        await request(server)
            .post(`/api/auth/resend-verification`)
            .send({ })
            .expect(400)
    })

    it("Returns a 400 with an invalid email", async () => {
        await request(server)
            .post(`/api/auth/resend-verification`)
            .send({ 
                email: "invalid_email"
            })
            .expect(400)
    })

    it("Returns a 404 User Not Found with non existent email", async () => {
        await request(server)
            .post(`/api/auth/resend-verification`)
            .send({ 
                email: "test@test.com"
            })
            .expect(404)
    })
})

describe("requestConfirmationEmail Request Handler Tests", () => {
    it("Returns 409 Request conflict for already confirmed user", async () => {
        await global.createUser(true, false); 

        await request(server)
            .post(`/api/auth/resend-verification`)
            .send({ 
                email: "test@test.com"
            })
            .expect(409)
    })

    it("Returns 200 success if verification email is sent successfully", async () => {
        await global.createUser(false, false); 

        await request(server)
            .post(`/api/auth/resend-verification`)
            .send({ 
                email: "test@test.com"
            })
            .expect(200)

        // Check if email was triggered correctly
        // Expect resend to have been called one time for reset password email
        expect(resend.emails.send).toHaveBeenCalledTimes(1); 
    })
})