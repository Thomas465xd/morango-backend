jest.mock("../../../utils/jwt", () => ({
    ...jest.requireActual("../../../utils/jwt"),
    generatePasswordResetToken: jest.fn(() => "mocked-reset-token"),
}));
import request from "supertest"
import server from "../../../server"
import User from "../../../models/User";
import { generatePasswordResetToken } from "../../../utils/jwt";
import resend from "../../../config/resend";

//? 📋 Input Validation Tests
describe("Input Validation Tests", () => {
    it("Returns a 400 with missing name, surname, email or address attributes", async () => {
        await request(server)
            .post("/api/auth/register/checkout")
            .send({ })
            .expect(400)
    })

    it("Returns a 400 with empty fields for address", async () => {
        return request(server)
            .post("/api/auth/register/checkout")
            .send({
                name: "Thomas", 
                surname: "Del Campo", 
                email: "invalid_email", 
                phone: "992128901",
                address: {
                    country: "", 
                    region: "",
                    city: "", 
                    cityArea: "", 
                    street: "", 
                    reference: "", // this ones can be empty
                    zipCode: ""
                }
            })
            .expect(400)
    })

    it("Returns a 400 with invalid email", async () => {
        return request(server)
            .post("/api/auth/register/checkout")
            .send({
                name: "Thomas", 
                surname: "Del Campo", 
                email: "invalid_email", 
                phone: "992128901",
                address: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago", 
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor 1234", 
                    reference: "", // this ones can be empty
                    zipCode: ""
                }
            })
            .expect(400)
    })

    it("Returns a 400 with invalid phone (chile)", async () => {
        return request(server)
            .post("/api/auth/register/checkout")
            .send({
                name: "Thomas", 
                surname: "Del Campo", 
                email: "test@test.com", 
                phone: "+992128901",
                address: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago", 
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor 1234", 
                    reference: "", // this ones can be empty
                    zipCode: ""
                }
            })
            .expect(400)
    })

    it("Returns a 400 with invalid region (Regions enum)", async () => {
        return request(server)
            .post("/api/auth/register/checkout")
            .send({
                name: "Thomas", 
                surname: "Del Campo", 
                email: "test@test.com", 
                phone: "992128901",
                address: {
                    country: "Chile", 
                    region: "Metropolitana", 
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor 1234", 
                    reference: "", // this ones can be empty
                    zipCode: ""
                }
            })
            .expect(400)
    })
})

// TODO: Validate that orders registered as guest with user email are now linked to it's new account
describe("createCheckoutAccount Request Handler Tests", () => {
    it("Returns a 201 if user is registered correctly with matching properties", async () => { 
        const response = await request(server)
            .post("/api/auth/register/checkout")
            .send({
                name: "Thomas", 
                surname: "Del Campo", 
                email: "test@test.com", 
                phone: "992128901",
                address: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago", 
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor 1234", 
                    reference: "", // this ones can be empty
                    zipCode: ""
                }
            })
            .expect(201)

        const user = response.body.user; 
            

        // Expect new user info to be equal to request body info
        expect(user.confirmed).toEqual(false); 
        expect(user.password).not.toBeDefined();  

        expect(user.name).toBe("Thomas")
        expect(user.surname).toBe("Del Campo")
        expect(user.email).toBe("test@test.com")
        expect(user.phone).toBe("992128901")
        expect(user.address.country).toBe("Chile")
        expect(user.address.region).toBe("Metropolitana de Santiago")
        expect(user.address.city).toBe("Santiago")
        expect(user.address.cityArea).toBe("Las Condes")
        expect(user.address.street).toBe("Manor 1234")
        expect(user.address.reference).toBe("")
        expect(user.address.zipCode).toBe("")

        const createdUser = await User.findById(user.id); 
        expect(createdUser).toBeDefined(); 
        expect(createdUser.confirmed).toBe(false); 
        expect(createdUser.password).toBeNull(); 

        // Expect resend to have been called one time for reset password email
        expect(resend.emails.send).toHaveBeenCalledTimes(1); 
    })
})