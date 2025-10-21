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
    },
    async getCategories() {
        return db("categoryL2")
            .select("catetgoryL2.*", "categoryL1.category_name as parent_name")
            .leftJoin("categoryL1", "categoryL2.categoryL1_id", "categoryL1.id")
            .orderBy("categoryL1.category_name", "asc")
            .orderBy("categoryL2.categoryL2_name", "asc");
    }
};