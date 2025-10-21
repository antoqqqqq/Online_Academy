import db from "../utils/db.js";

export default {
    async create (course) {
        return db("courses").insert(course).returning("*");
    },
    async update(course_id, data) {
        return db("courses").where({ course_id }).update(data);
    },
    async findById(course_id) {
        return db("courses").where({ course_id }).first();
    },
    async findByInstructor(instructor_id) {
        return db("courses").where({ instructor_id });
    },
    async findAll({ limit = 10, offset = 0 } = {}) {
        return db("courses").limit(limit).offset(offset);
    }
};