import db from "../utils/db.js";

export default {
    async create(video) {
        return db("video").insert(video).returning("*");
    },
    async findByLecture(lecture_id) {
        return db("video").where({ lecture_id });
    },
    async findById(id) {
        return db("video").where({ id }).first();
    }
};