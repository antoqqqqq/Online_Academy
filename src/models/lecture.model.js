import db from "../utils/db.js";

export default {
    async create(lecture) {
        return db("lecture").insert(lecture).returning("*");
    },
    async update(id, data) {
        return db("lecture").where({ id }).update(data);
    },
    async findByCourse(course_id) {
        return db("lecture").where({ course_id }).orderBy("created_at", "asc");
    },
    async findById(id) {
        return db("lecture").where({ id }).first();
    },
    async countByCourse(course_id) {
        const result = await db("lecture").where({ course_id }).count("* as count").first();
        return result.count;
    },
    async getWithVideo(lecture_id) {
        return db("lecture")
            .select("lecture.*", "video.url as video_url", "video.time as video_time")
            .leftJoin("video", "lecture.id", "video.lecture_id")
            .where("lecture.id", lecture_id)
            .first();
    }
};