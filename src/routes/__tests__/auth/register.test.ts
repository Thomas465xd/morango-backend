import request from "supertest"
import server from "../../../server"

//? 📋 Input Validation Tests
describe("Input Validation Tests", () => {
    it("Returns a 400 with missing name, surname, email or password", async () => {
        await request(server)
            .post("/api/auth/register")
            .send({
                surname: "Del Campo", 
                email: "test@test.com", 
                password: "password", 
                confirmPassword: "password"
            })
            .expect(400)
        await request(server)
            .post("/api/auth/register")
            .send({
                name: "Thomas",
                email: "test@test.com", 
                password: "password", 
                confirmPassword: "password"
            })
            .expect(400)
        await request(server)
            .post("/api/auth/register")
            .send({
                name: "Thomas", 
                surname: "Del Campo",
                password: "password", 
                confirmPassword: "password"
            })
            .expect(400)
        await request(server)
            .post("/api/auth/register")
            .send({
                name: "Thomas", 
                surname: "Del Campo", 
                email: "test@test.com", 
            })
            .expect(400)
        await request(server)
            .post("/api/auth/register")
            .send({
                name: "Thomas", 
                surname: "Del Campo", 
                email: "test@test.com", 
                password: "password"
            })
            .expect(400)
    })

    it("Returns a 400 with invalid Email", async () => {
        return request(server)
            .post("/api/auth/register")
            .send({
                name: "Thomas", 
                surname: "Del Campo", 
                email: "invalid_email", 
                password: "password", 
                confirmPassword: "password"
            })
            .expect(400)
    })

    it("Returns a 400 with non matching passwords", async () => {
        return request(server)
            .post("/api/auth/register")
            .send({
                name: "Thomas", 
                surname: "Del Campo", 
                email: "test@test.com", 
                password: "password_1", 
                confirmPassword: "password_2"
            })
            .expect(400)
    })
})

describe("AuthController Request Handler Tests", () => {
    it("Returns 201 for successful user register", async () => {
        return request(server)
            .post("/api/auth/register")
            .send({
                name: "Thomas", 
                surname: "Del Campo", 
                email: "test@test.com", 
                password: "password", 
                confirmPassword: "password"
            })
            .expect(201)
    })

    it("Returns 409 for registering with an already registered email", async () => {
        await request(server)
            .post("/api/auth/register")
            .send({
                name: "Thomas", 
                surname: "Del Campo", 
                email: "test@test.com", 
                password: "password", 
                confirmPassword: "password"
            })
            .expect(201)

        await request(server)
            .post("/api/auth/register")
            .send({
                name: "Thomas", 
                surname: "Del Campo", 
                email: "test@test.com", 
                password: "password", 
                confirmPassword: "password"
            })
            .expect(409)
    })
})