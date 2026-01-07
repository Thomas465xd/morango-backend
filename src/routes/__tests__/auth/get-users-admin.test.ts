import request from "supertest"
import server from "../../../server"
import mongoose from "mongoose"

//? 📋 Input Validation Tests
describe("/api/auth/admin Input Validation Tests", () => {
    it("Returns a 403 Forbidden for non admin or not auth user trying to search user", async () => {
        const customer = await global.createUser(true, false); 

        await request(server)
            .get(`/api/auth/admin`)
            .send()
            .set("Cookie", global.setCookie(customer.id))
            .expect(403)

        await request(server)
            .get(`/api/auth/admin`)
            .send()
            .expect(403)
    })

    it("Returns a 400 with invalid confirmed query param (not boolean or empty)", async () => {
        const admin = await global.createUser(true, true); 

        const r1 = await request(server)
            .get(`/api/auth/admin?confirmed=`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)

        expect(r1.body.errors[0].field).toEqual("confirmed")
        expect(r1.body.errors.length).toEqual(2) // one for empty and one for invalid

        const r2 = await request(server)
            .get(`/api/auth/admin?confirmed=yes`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)

        expect(r2.body.errors[0].field).toEqual("confirmed")
        expect(r2.body.errors.length).toEqual(1) //one for invalid
    })

    it("Returns a 400 with invalid search query param (larger than 50 characters or lower than 2)", async () => {
        const admin = await global.createUser(true, true); 

        const search1 = "a"
        const search2 = "a".repeat(52)

        const r1 = await request(server)
            .get(`/api/auth/admin?search=${search1}`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)

        expect(r1.body.errors[0].field).toEqual("search")
        expect(r1.body.errors.length).toEqual(1)

        const r2 = await request(server)
            .get(`/api/auth/admin?search=${search2}`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)

        expect(r2.body.errors[0].field).toEqual("search")
        expect(r2.body.errors.length).toEqual(1)
    })

    it("Returns a 400 if ?sortOrder or ?sortBy query param is invalid (not asc or desc and not 'date')", async () => {
        const admin = await global.createUser(true, true); 

        const { order } = await global.createOrder(); 
        
        await global.createPayment(order)

        const r1 = await request(server)
            .get(`/api/auth/admin?sortOrder=asdf`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)

        const r2 = await request(server)
            .get(`/api/auth/admin?sortOrder=asc&sortBy=createdAt`) // should be sortBy=date
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(400)

        expect(r1.body.errors[0].field).toEqual('sortOrder')
        expect(r1.body.errors.length).toEqual(1)

        expect(r2.body.errors[0].field).toEqual('sortBy')
        expect(r2.body.errors.length).toEqual(1)
    })
})

describe("getUsers Request Handler Tests", () => {
    it("Returns 200 OK with filtered users info, pagination data and filters in response", async () => {
        const admin = await global.createUser(true, true); 

        await global.createUser(true, false, "customer1@customer1.com", "Anton"); 
        await global.createUser(true, false, "customer2@customer2.com", "Benjamín");
        await global.createUser(false, false, "customer3@customer3.com", "Carlo")
        await global.createUser(true, false, "customer4@customer4.com", "Darco")
        await global.createUser(false, false, "customer5@customer5.com", "Antonio"); 

        // Filters
        const confirmed = true; 
        const sortBy = "name"; 
        const sortOrder = "desc"; 
        const searchEmail = "customer2@customer2.com"; 
        const searchName = "Anto"; 

        // Test confirmed filter
        const r1 = await request(server)
            .get(`/api/auth/admin?page=1&perPage=10&confirmed=${confirmed}`)
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // Test sorting
        const r2 = await request(server)
            .get(`/api/auth/admin?page=1&perPage=10&sortBy=${sortBy}&sortOrder=${sortOrder}`) // asc means orders will be sorted from first one created to last one.
            .send()
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        console.log(r2.body.errors)

        // Test search param with email
        const r3= await request(server)
            .get(`/api/auth/admin?page=1&perPage=10&search=${searchEmail}`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        // Test search param with username
        const r4 = await request(server)
            .get(`/api/auth/admin?page=1&perPage=10&search=${searchName}`)
            .set("Cookie", global.setCookie(admin.id))
            .expect(200)

        //* Test confirmed filter
        expect(r1.body.users).toBeDefined();
        expect(r1.body.users).toHaveLength(4); // customer1, customer2, customer4 & admin 

        r1.body.users.forEach((user: any) => {
            expect(user.confirmed).toBe(true);
        });

        expect(r1.body.totalUsers).toEqual(4);
        expect(r1.body.totalPages).toEqual(1);
        expect(r1.body.perPage).toEqual(10);
        expect(r1.body.currentPage).toEqual(1);

        expect(r1.body.filters.confirmed).toEqual("true");
        expect(r1.body.filters.search).toBeNull();
        expect(r1.body.filters.sortBy).toEqual("name");

        //* Test sorting by name (desc) Z-A
        expect(r2.body.users).toHaveLength(6); // count admin

        const names = r2.body.users.map((u: any) => u.name);
        expect(names).toEqual([...names].sort().reverse());

        expect(r2.body.filters.sortBy).toEqual("name");
        expect(r2.body.filters.sortOrder).toEqual(-1);

        //* Test email text searching (searchEmail)
        expect(r3.body.users).toHaveLength(1);
        expect(r3.body.users[0].email).toEqual(searchEmail);

        expect(r3.body.filters.search).toEqual(searchEmail);

        //* Test name text search (searchName)
        expect(r4.body.users).toHaveLength(2); // Anton & Antonio

        const matchedNames = r4.body.users.map((u: any) => u.name);
        expect(matchedNames).toEqual(
            expect.arrayContaining(["Anton", "Antonio"])
        );

        expect(r4.body.filters.search).toEqual(searchName);
    });
})