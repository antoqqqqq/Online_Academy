import db from "../utils/db.js";

export default {
    async findByAccountId(account_id) {
        return db("instructor").where({ account_id }).first();
    },
    async create(instructor) {
        return db("instructor").insert(instructor).returning("*");
    },
    async update(instructor_id, data) {
        return db("instructor").where({ instructor_id }).update(data);
    },
    async getCourses(instructor_id) {
        return db("courses").where({ instructor_id });
    },
    async findById(instructor_id) {
        return db("instructor").where({ instructor_id }).first();
    }
};