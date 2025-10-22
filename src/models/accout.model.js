import db from "../utils/db.js";
export default {
    async updateProfile(id, name, email) {
        const result = await db("account")
        .where("id", id)
        .update({ name: name, email: email });
        return result;
    },
    async isEmailAvailable(email) {
        const exist = await db("account")
        .where("email", email)
        .first();
        return !exist;
    },
    async findUserById(id) {
        const user = await db("account")
        .where("id", id)
        .first();
        return user || null;
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
    },
    async findOrCreateGoogleUser(user) {
        const exist = await db("account")
        .where("email", user.emails[0].value)
        .first();
        if (!exist) {
            const newUser = {
                email: user.emails[0].value,
                name: user.displayName
            };
            const result = await db("account").insert(newUser).returning("*");
            return result[0];
        }
        return exist;
        // Implementation for finding or creating a Google user
    },
    async updatePassword(id, hashedPassword) {
        const result = await db("account")
        .where("id", id)
        .update({ password: hashedPassword });
        return result;
    }

}