import db from "../utils/db.js";
export default {
    async isEmailAvailable(email) {
        const exist = await db("account")
        .where("email", email)
        .first();
        return !exist;
    },
    async add(user) {
        const result = await db("account").insert(user);
        return result;
    },
    async findByEmail(email) {
        const user = await db("account")
        .where("email", email)
        .first();
        return user || null;
    }
}