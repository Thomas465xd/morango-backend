jest.mock("../../../utils/jwt", () => ({
    ...jest.requireActual("../../../utils/jwt"),
    generateConfirmationToken: jest.fn(() => "mocked-token"),
}));

import request from "supertest"
import server from "../../../server"
import { generateJWT } from "../../../utils/jwt";
import mongoose from "mongoose";
import Token from "../../../models/Token";

//? 📋 Input Validation Tests
describe("Input Validation Tests", () => {
    it("Returns a 400 with an invalid token (non JWT)", async () => {
        await request(server)
            .post(`/api/auth/reset-password/invalid_token`)
            .send({ 
                password: "password", 
                confirmPassword: "password"
            })
            .expect(400)
    })

    it("Returns a 400 with an empty password or confirm password", async () => {
        const user = await global.createUser(true, false)
        const token = await global.createToken(user.id, "password_reset")

        await request(server)
            .post(`/api/auth/reset-password/${token.token}`)
            .send({ 
                password: "", 
                confirmPassword: ""
            })
            .expect(400)
    })

    it("Returns a 400 with non matching passwords", async () => {
        const user = await global.createUser(true, false)
        const token = await global.createToken(user.id, "password_reset")

        await request(server)
            .post(`/api/auth/reset-password/${token.token}`)
            .send({ 
                password: "password-1", 
                confirmPassword: "password-2"
            })
            .expect(400)
    })

    it("Returns a 404 Token Not Found with a non existent token", async () => {
        const fakeToken = generateJWT({ id: new mongoose.Types.ObjectId })

        await request(server)
            .post(`/api/auth/reset-password/${fakeToken}`)
            .send({ 
                password: "password", 
                confirmPassword: "password" 
            })
            .expect(404)
    })
})

describe("requestConfirmationEmail Request Handler Tests", () => {
    it("Returns 404 User Not Found if token user does not exist", async () => {
        const token = await global.createToken(new mongoose.Types.ObjectId, "password_reset")

        await request(server)
            .post(`/api/auth/reset-password/${token.token}`)
            .send({ 
                password: "password", 
                confirmPassword: "password"
            })
            .expect(404)
    })

    it("Returns 200 if password is successfully set", async () => {
        const user = await global.createUser(true, false)
        const token = await global.createToken(user.id, "password_reset")

        const response = await request(server)
            .post(`/api/auth/reset-password/${token.token}`)
            .send({ 
                password: "password", 
                confirmPassword: "password"
            })
            .expect(200)

        // Check if auth cookie is sent back
        expect(response.get("Set-Cookie")).toBeDefined(); 

        // Check if token was deleted from DB
        const deletedToken = await Token.findById(token.id); 
        expect(deletedToken).toBeNull(); 
    })
})