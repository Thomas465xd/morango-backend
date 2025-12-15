import request from "supertest"
import server from "../../../server"
import { generateConfirmationToken } from "../../../utils/jwt"
import mongoose from "mongoose"
import User from "../../../models/User"

//? 📋 Input Validation Tests
// describe("Input Validation Tests", () => {
//     it("Returns a 400 with malformed token", async () => {
//         await request(server)
//             .post(`/api/auth/confirm/`)
//             .send({})
//             .expect(400)
//     })
// })

describe("confirmAccount Request Handler Tests", () => {
    it("Returns 404 Token Not Found", async () => {
        const userId = new mongoose.Types.ObjectId; 
        const token = generateConfirmationToken({ id: userId })

        await request(server)
            .post(`/api/auth/confirm/${token}`)
            .send()
            .expect(404)
    })

    it("Returns 404 if token exists but user does not", async () => {
        const user = await global.createUser(false);
        const token = await global.createToken(user.id, "email_verification")

        const deleteUser = await User.findById(user.id)
        await deleteUser.deleteOne(); 

        await request(server)
            .post(`/api/auth/confirm/${token.token}`)
            .send()
            .expect(404)
    })

    it("Returns 201 if user is successfully confirmed", async () => {
        const user = await global.createUser(false);
        const token = await global.createToken(user.id, "email_verification")

        await request(server)
            .post(`/api/auth/confirm/${token.token}`)
            .send()
            .expect(201)

        const confirmedUser = await User.findById(user.id) 

        expect(confirmedUser.confirmed).toBe(true); 
    })
})