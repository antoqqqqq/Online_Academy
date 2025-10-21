import db from "../utils/db.js";

export default {
    async create(lecture) {
        return db("lecture").insert(lecture).returning("*");
    },
    async update(id, data) {
        return db("lecture").where({ id }).update(data);
    },
    async findByCourse(course_id) {
        return db("lecture").where({ course_id });
    },
    async findById(id) {
        return db("lecture").where({ id }).first();
    }
};