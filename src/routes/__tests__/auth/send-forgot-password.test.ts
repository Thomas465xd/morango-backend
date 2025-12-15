jest.mock("../../../utils/jwt", () => ({
    ...jest.requireActual("../../../utils/jwt"),
    generateConfirmationToken: jest.fn(() => "mocked-token"),
}));

import request from "supertest"
import server from "../../../server"
import { generateConfirmationToken } from "../../../utils/jwt";

//? 📋 Input Validation Tests
describe("Input Validation Tests", () => {
    it("Returns a 400 with an empty email", async () => {
        await request(server)
            .post(`/api/auth/forgot-password`)
            .send({ })
            .expect(400)
    })

    it("Returns a 400 with an invalid email", async () => {
        await request(server)
            .post(`/api/auth/forgot-password`)
            .send({ 
                email: "invalid_email"
            })
            .expect(400)
    })

    it("Returns a 404 User Not Found with non existent email", async () => {
        await request(server)
            .post(`/api/auth/forgot-password`)
            .send({ 
                email: "test@test.com"
            })
            .expect(404)
    })
})

describe("requestPasswordEmail Request Handler Tests", () => {
    it("Returns 401 Not Authorized if user is not confirmed", async () => {
        await global.createUser(false, false); 

        await request(server)
            .post(`/api/auth/forgot-password`)
            .send({ 
                email: "test@test.com"
            })
            .expect(401)

        expect(generateConfirmationToken).toHaveBeenCalled(); 
    })

    it("Returns 200 if token is set successfully along with email", async () => {
        await global.createUser(true, false); 

        await request(server)
            .post(`/api/auth/forgot-password`)
            .send({ 
                email: "test@test.com"
            })
            .expect(200)

        // TODO: Check if email was triggered correctly
        // expect(AuthEmails.ResetPasswordEmail).toHaveBeenCalled()
    })
})