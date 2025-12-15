jest.mock("../../../utils/jwt", () => ({
    ...jest.requireActual("../../../utils/jwt"),
    generateConfirmationToken: jest.fn(() => "mocked-token"),
    generateAdminJWT: jest.fn(() => "mocked--admin-token"), 
    generateJWT: jest.fn(() => "mocked-customer-token")
}));

import request from "supertest"
import server from "../../../server"
import { generateAdminJWT, generateConfirmationToken, generateJWT } from "../../../utils/jwt"

//? 📋 Input Validation Tests
describe("Input Validation Tests", () => {
    it("Returns a 400 with empty email or password", async () => {
        await global.createUser(true);

        await request(server)
            .post(`/api/auth/login`)
            .send({
                password: "password"
            })
            .expect(400)
        await request(server)
            .post(`/api/auth/login`)
            .send({
                email: "test@test.com"
            })
            .expect(400)
    })

    it("Returns a 400 with invalid email", async () => {
        await global.createUser(true);

        await request(server)
            .post(`/api/auth/login`)
            .send({
                email: "invalid_email",
                password: "password"
            })
            .expect(400)
    })
})

describe("login Request Handler Tests", () => {
    it("Returns 404 User Not Found", async () => {
        await request(server)
            .post(`/api/auth/login`)
            .send({
                email: "test@test.com", 
                password: "password"
            })
            .expect(404)
    })

    it("Returns 401 if user is not confirmed", async () => {
        await global.createUser(false);

        await request(server)
            .post(`/api/auth/login`)
            .send({
                email: "test@test.com", 
                password: "password"
            })
            .expect(401)

        expect(generateConfirmationToken).toHaveBeenCalled(); 
    })

    it("Returns 401 unauthorized if provided password is incorrect", async () => {
        await global.createUser(true);

        await request(server)
            .post(`/api/auth/login`)
            .send({
                email: "test@test.com", 
                password: "passwords"
            })
            .expect(401)
    })

    it("Responds with a cookie if customer login was successful", async () => {
        await global.createUser(true, false);

        const response = await request(server)
            .post(`/api/auth/login`)
            .send({
                email: "test@test.com", 
                password: "password"
            })
            .expect(200)

        expect(response.get("Set-Cookie")).toBeDefined(); 
        expect(generateJWT).toHaveBeenCalled(); 
    })

    it("Responds with a cookie if admin login was successful", async () => {
        await global.createUser(true, true);

        const response = await request(server)
            .post(`/api/auth/login`)
            .send({
                email: "test@test.com", 
                password: "password"
            })
            .expect(200)

        expect(response.get("Set-Cookie")).toBeDefined(); 
        expect(generateAdminJWT).toHaveBeenCalled(); 
    })
})