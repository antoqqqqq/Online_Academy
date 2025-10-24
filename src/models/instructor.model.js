import db from "../utils/db.js";

export default {
    async findByAccountId(account_id) {
        return db("instructor")
            .select("instructor.*", "account.name", "account.email")
            .leftJoin("account", "instructor.account_id", "account.id")
            .where("instructor.account_id", account_id)
            .first();
    },
    async create(instructor) {
        return db("instructor").insert(instructor).returning("*");
    },
    async update(instructor_id, data) {
        return db("instructor").where({ instructor_id }).update(data);
    },
    async updateByAccountId(account_id, data) {
        return db("instructor").where({ account_id }).update(data);
    },
    async getCourses(instructor_id) {
        return db("courses").where({ instructor_id }).orderBy("created_at", "desc");
    },
    async findById(instructor_id) {
        return db("instructor")
            .select("instructor.*", "account.name", "account.email")
            .leftJoin("account", "instructor.account_id", "account.id")
            .where("instructor.instructor_id", instructor_id)
            .first();
    },
    async getStats(instructor_id) {
        const courseCount = await db("courses").where({ instructor_id }).count("* as count").first();
        const studentCount = await db("enrollment")
            .leftJoin("courses", "enrollment.course_id", "courses.course_id")
            .where("courses.instructor_id", instructor_id)
            .countDistinct("enrollment.student_id as count")
            .first();
        const totalRevenue = await db("enrollment")
            .leftJoin("courses", "enrollment.course_id", "courses.course_id")
            .where("courses.instructor_id", instructor_id)
            .sum("courses.current_price as total")
            .first();
        return {
            courseCount: courseCount.count,
            studentCount: studentCount.count,
            totalRevenue: totalRevenue.total || 0
        };
    }
};