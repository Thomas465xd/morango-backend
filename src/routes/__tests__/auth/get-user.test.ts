import request from "supertest"
import server from "../../../server"

//? 📋 Input Validation Tests
describe("Input Validation Tests", () => {
    it("Returns a 401 with a non existent user", async () => {
        await request(server)
            .get(`/api/auth/user`)
            .set("Cookie", global.setCookie())
            .send()
            .expect(401)
    })
})

describe("getUser Request Handler Tests", () => {
    it("Returns user data", async () => {
        const user = await global.createUser(true, false); 
        
        const response = await request(server)
            .get(`/api/auth/user`)
            .set("Cookie", global.setCookie(user.id))
            .send()
            .expect(200)

        expect(response.body.name).toEqual("Thomas")
        expect(response.body.surname).toEqual("Schrödinger")
        expect(response.body.email).toEqual("test@test.com")
        expect(response.body.confirmed).toEqual(true); 
    })
})