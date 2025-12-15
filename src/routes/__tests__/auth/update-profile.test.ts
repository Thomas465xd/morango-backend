import request from "supertest"
import server from "../../../server"
import User from "../../../models/User"

//? 📋 Input Validation Tests
describe("Input Validation Tests", () => {
    it("Returns a 401 with a non existent user", async () => {
        await request(server)
            .patch(`/api/auth/profile`)
            .set("Cookie", global.setCookie())
            .send()
            .expect(401)
    })

    it("Returns a 400 if inputs are provided in an empty state", async () => {
        const user = await global.createUser(true); 

        await request(server)
            .patch(`/api/auth/profile`)
            .set("Cookie", global.setCookie(user.id))
            .send({
                name: "", 
                surname: "", 
                email: "", 
                phone: "", 
                address: {
                    country: "", 
                    region: "", 
                    city: "", 
                    cityArea: "", 
                    street: "", 
                    // reference: "", this ones can be empty
                    // zipCode: ""
                }
            })
            .expect(400)
    })

    it("Returns a 400 if an invalid email is provided", async () => {
        const user = await global.createUser(true); 

        await request(server)
            .patch(`/api/auth/profile`)
            .set("Cookie", global.setCookie(user.id))
            .send({
                name: "Thomas", 
                surname: "Schrödinger", 
                email: "invalid_email", 
                phone: "992128901", 
                address: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago", 
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor 1234", 
                    // reference: "", this ones can be empty
                    // zipCode: ""
                }
            })
            .expect(400)
    })

    it("Returns a 400 if an invalid phone number is provided (chilean phone)", async () => {
        const user = await global.createUser(true); 

        await request(server)
            .patch(`/api/auth/profile`)
            .set("Cookie", global.setCookie(user.id))
            .send({
                name: "Thomas", 
                surname: "Schrödinger", 
                email: "test@test.com", 
                phone: "+992128901", // Only accepts +56 9 9212 8901 or 992128901
                address: {
                    country: "Chile", 
                    region: "Metropolitana de Santiago", 
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor 1234", 
                    // reference: "", this ones can be empty
                    // zipCode: ""
                }
            })
            .expect(400)
    })

    it("Returns a 400 if an invalid region is provided (User model Regions enum)", async () => {
        const user = await global.createUser(true); 

        await request(server)
            .patch(`/api/auth/profile`)
            .set("Cookie", global.setCookie(user.id))
            .send({
                name: "Thomas", 
                surname: "Schrödinger", 
                email: "test@test.com", 
                phone: "992128901", // accepts +56 9 9212 8901 or 992128901
                address: {
                    country: "Chile", 
                    region: "Metropolitana", // Should be "Metropolitana de Santiago"
                    city: "Santiago", 
                    cityArea: "Las Condes", 
                    street: "Manor 1234", 
                    reference: "",
                    zipCode: ""
                }
            })
            .expect(400)
    })
})

describe("updateProfile Request Handler Tests", () => {
    it("Returns 200 if user is updated successfully", async () => {
        const user = await global.createUser(true); 

        await request(server)
            .patch(`/api/auth/profile`)
            .set("Cookie", global.setCookie(user.id))
            .send({
                name: "John", 
                surname: "Doe", 
                email: "john@doe.com", 
                phone: "992128901", // accepts +56 9 9212 8901 or 992128901
                address: {
                    country: "Chile", 
                    region: "Antofagasta", // Should be "Metropolitana de Santiago"
                    city: "Antofagasta", 
                    cityArea: "Antofagasta", 
                    street: "Manor 1234 Updated", 
                    reference: "Apartment 123",
                    zipCode: "1234567"
                }
            })
            .expect(200)

        const updatedUser = await User.findById(user.id); 

        // Expect the data to be the one provided in the request body
        expect(updatedUser.name).toBe("John")
        expect(updatedUser.surname).toBe("Doe")
        expect(updatedUser.email).toBe("john@doe.com")
        expect(updatedUser.phone).toBe("992128901")
        expect(updatedUser.address.country).toBe("Chile")
        expect(updatedUser.address.region).toBe("Antofagasta")
        expect(updatedUser.address.city).toBe("Antofagasta")
        expect(updatedUser.address.cityArea).toBe("Antofagasta")
        expect(updatedUser.address.street).toBe("Manor 1234 Updated")
        expect(updatedUser.address.reference).toBe("Apartment 123")
        expect(updatedUser.address.zipCode).toBe("1234567")
    })
})