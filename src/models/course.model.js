import db from "../utils/db.js";

export default {
    async create (course) {
        return db("courses").insert(course).returning("*");
    },
    async update(course_id, data) {
        return db("courses").where({ course_id }).update(data);
    },
    async findById(course_id) {
        return db("courses")
            .select("courses.*", "instructor.name as instructor_name", "instructor.bio as instructor_bio", "categoryL2.categoryL2_name as category_name", "categoryL1.category_name as parent_category_name")
            .leftJoin("instructor", "courses.instructor_id", "instructor.instructor_id")
            .leftJoin("categoryL2", "courses.category_id", "categoryL2.id")
            .leftJoin("categoryL1", "categoryL2.categoryL1_id", "categoryL1.id")
            .where("courses.course_id", course_id)
            .first();
    },
    async findByInstructor(instructor_id) {
        return db("courses").where({ instructor_id }).orderBy("latest_update", "desc");
    },
    async findAll({ limit = 10, offset = 0, category_id = null } = {}) {
        let query = db("courses")
            .select("courses.*", "instructor.name as instructor_name", "categoryL2.categoryL2_name as category_name")
            .leftJoin("instructor", "courses.instructor_id", "instructor.instructor_id")
            .leftJoin("categoryL2", "courses.category_id", "categoryL2.id")
            .limit(limit)
            .offset(offset);
        if (category_id) {
            query = query.where("courses.category_id", category_id);
        }
        return query;
    },
    async getCategories() {
        return db("categoryL2")
            .select("categoryL2.*", "categoryL1.category_name as parent_name")
            .leftJoin("categoryL1", "categoryL2.categoryL1_id", "categoryL1.id")
            .orderBy("categoryL1.category_name", "asc")
            .orderBy("categoryL2.categoryL2_name", "asc");
    },
    async countByInstructor(instructor_id) {
        const result = await db("courses")
            .where({ instructor_id })
            .count("* as count")
            .first();
        return result.count;
    },
    async searchCourses(searchTerm, { limit = 10, offset = 0 } = {}) {
        return db("courses")
            .select("courses.*", "instructor.name as instructor_name", "categoryL2.categoryL2_name as category_name")
            .leftJoin("instructor", "courses.instructor_id", "instructor.instructor_id")
            .leftJoin("categoryL2", "courses.category_id", "categoryL2.id")
            .where("courses.title", "ilike", `%${searchTerm}%`)
            .orWhere("courses.description", "ilike", `%${searchTerm}%`)
            .orWhere("categoryL2.categoryL2_name", "ilike", `%${searchTerm}%`)
            .limit(limit)
            .offset(offset);
    }
};