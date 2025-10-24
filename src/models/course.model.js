import db from "../utils/db.js";

export default {
    // Lấy thông tin chi tiết khóa học
    async getCourseById(courseId) {
        try {
            const course = await db("courses")
                .join("instructor", db.raw("CAST(courses.instructor_id AS INTEGER)"), "instructor.instructor_id")
                .join("categoryL2", "courses.category_id", "categoryL2.id")
                .where("courses.course_id", courseId)
                .select(
                    "courses.*",
                    "instructor.name as instructor_name",
                    "categoryL2.category_name as category_name"
                )
                .first();
            
            if (!course) return null;

            // Lấy danh sách video của khóa học
            const videos = await db("video")
                .join("lecture", "video.lecture_id", "lecture.id")
                .where("lecture.course_id", courseId)
                .orderBy("video.id", "asc");
            
            course.videos = videos;
            return course;
        } catch (error) {
            console.error("Error getting course by id:", error);
            throw error;
        }
    },

    // Lấy danh sách video của khóa học
    async getCourseVideos(courseId) {
        try {
            const videos = await db("video")
                .where("course_id", courseId)
                .orderBy("order_index", "asc");
            return videos;
        } catch (error) {
            console.error("Error getting course videos:", error);
            throw error;
        }
    },

    // Lấy thông tin video chi tiết
    async getVideoById(videoId) {
        try {
            const video = await db("video")
                .join("courses", "video.course_id", "courses.id")
                .where("video.id", videoId)
                .select(
                    "video.*",
                    "courses.title as course_title",
                    "courses.instructor_id"
                )
                .first();
            return video;
        } catch (error) {
            console.error("Error getting video by id:", error);
            throw error;
        }
    },

    // Lấy video tiếp theo trong khóa học
    async getNextVideo(courseId, currentVideoOrder) {
        try {
            const video = await db("video")
                .where("course_id", courseId)
                .where("order_index", ">", currentVideoOrder)
                .orderBy("order_index", "asc")
                .first();
            return video;
        } catch (error) {
            console.error("Error getting next video:", error);
            throw error;
        }
    },

    // Lấy video trước đó trong khóa học
    async getPreviousVideo(courseId, currentVideoOrder) {
        try {
            const video = await db("video")
                .where("course_id", courseId)
                .where("order_index", "<", currentVideoOrder)
                .orderBy("order_index", "desc")
                .first();
            return video;
        } catch (error) {
            console.error("Error getting previous video:", error);
            throw error;
        }
    },

    // Cập nhật số lượng học viên của khóa học
    async updateStudentCount(courseId) {
        try {
            const count = await db("enrollment")
                .where("course_id", courseId)
                .count("* as count")
                .first();
            
            await db("courses")
                .where("course_id", courseId)
                .update({
                    total_enrollment: parseInt(count.count)
                });
            
            return parseInt(count.count);
        } catch (error) {
            console.error("Error updating student count:", error);
            throw error;
        }
    },
    async search(keyword){
        try {
            return db("courses")
                .whereRaw(`fts @@ to_tsquery(remove_accent(?))`,[keyword])
        } catch{
            console.error("Error getting courses with filter:", error);
            throw error;
        }
    },
    // Lấy danh sách khóa học với filter
    async getCoursesWithFilter(filters = {}) {
        try {
            let query = db("courses")
                .join("instructor", db.raw("CAST(courses.instructor_id AS INTEGER)"), "instructor.instructor_id")
                .join("categoryL2", "courses.category_id", "categoryL2.id")
                .select(
                    "courses.*",
                    "instructor.name as instructor_name",
                    "categoryL2.category_name as category_name"
                );

            if (filters.category) {
                query = query.where("courses.category_id", filters.category);
            }

            if (filters.level) {
                query = query.where("courses.level", filters.level);
            }

            if (filters.search) {
                query = query.whereILike("courses.title", `%${filters.search}%`);
            }

            if (filters.price_min) {
                query = query.where("courses.price", ">=", filters.price_min);
            }

            if (filters.price_max) {
                query = query.where("courses.price", "<=", filters.price_max);
            }

            const courses = await query
                .orderBy("courses.latest_update", "desc")
                .limit(filters.limit || 9)
                .offset(filters.offset || 0);

            return courses;
        } catch (error) {
            console.error("Error getting courses with filter:", error);
            throw error;
        }
    }
};
