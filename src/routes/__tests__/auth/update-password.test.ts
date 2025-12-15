import request from "supertest"
import server from "../../../server"
import User from "../../../models/User"

//? 📋 Input Validation Tests
describe("Input Validation Tests", () => {
    it("Returns a 401 with a non existent user", async () => {
        await request(server)
            .patch(`/api/auth/update-password`)
            .set("Cookie", global.setCookie())
            .send()
            .expect(401)
    })

    it("Returns a 400 if inputs are not provided", async () => {
        const user = await global.createUser(true); 

        await request(server)
            .patch(`/api/auth/update-password`)
            .set("Cookie", global.setCookie(user.id))
            .send()
            .expect(400)
    })

    it("Returns a 400 if new password is not equal to confirmPassword", async () => {
        const user = await global.createUser(true); 

        await request(server)
            .patch(`/api/auth/update-password`)
            .set("Cookie", global.setCookie(user.id))
            .send({
                current_password: "password",
                password: "new_password1", 
                confirmPassword: "new_password2"
            })
            .expect(400)
    })

    it("Returns a 400 if new password is shorter than 8 characters", async () => {
        const user = await global.createUser(true); 

        await request(server)
            .patch(`/api/auth/update-password`)
            .set("Cookie", global.setCookie(user.id))
            .send({
                current_password: "password",
                password: "new", 
                confirmPassword: "new"
            })
            .expect(400)
    })
})

describe("updatePassword Request Handler Tests", () => {
    it("Returns 401 Not Authorized if current password is wrong", async () => {
        const user = await global.createUser(true); 
        
        await request(server)
            .patch(`/api/auth/update-password`)
            .set("Cookie", global.setCookie(user.id))
            .send({
                current_password: "passwords", 
                password: "new_password", 
                confirmPassword: "new_password"
            })
            .expect(401)
    })

    it("Returns 200 if password is updated successfully", async () => {
        const user = await global.createUser(true); 
        
        await request(server)
            .patch(`/api/auth/update-password`)
            .set("Cookie", global.setCookie(user.id))
            .send({
                current_password: "password", 
                password: "new_password", 
                confirmPassword: "new_password"
            })
            .expect(200)

        const updatedUser = await User.findById(user.id); 

        // Expect that the password hashes are different
        expect(updatedUser.password).not.toBe(user.password);
    })
})