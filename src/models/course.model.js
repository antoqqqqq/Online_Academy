import db from "../utils/db.js";

export default {
    // ========== COURSE CRUD OPERATIONS ==========
    
    // Create a new course
    async create(course) {
        return db("courses").insert(course).returning("*");
    },

    // Update course data
    async update(course_id, data) {
        return db("courses").where({ course_id }).update(data);
    },

    // Delete course (with all related data)
    async delete(id) {
        try {
            // 1. Xóa feedback
            await db('feedback').where('course', id).del();

            // 2. Xóa enrollment (đăng ký học)
            await db('enrollment').where('course_id', id).del();

            // 3. Xóa watchlist (yêu thích)
            await db('watchlist_course').where('course_id', id).del();

            // 4. Xóa lectures và các video/process liên quan (cascade)
            const lectures = await db('lecture').where('course_id', id).select('id');
            const lectureIds = lectures.map(l => l.id);

            if (lectureIds.length > 0) {
                // 4a. Get all video IDs
                const videos = await db('video').whereIn('lecture_id', lectureIds).select('id');
                const videoIds = videos.map(v => v.id);

                if (videoIds.length > 0) {
                    // 4b. Delete video_process
                    await db('video_process').whereIn('video_id', videoIds).del();
                    // 4c. Delete videos
                    await db('video').whereIn('id', videoIds).del();
                }
                // 4d. Delete lectures
                await db('lecture').whereIn('id', lectureIds).del();
            }

            // 5. Cuối cùng, xóa khóa học
            await db('courses').where('course_id', id).del();

            return true; // Trả về true nếu thành công
        } catch (error) {
            console.error("Lỗi khi xóa khóa học:", error);
            return false; // Trả về false nếu thất bại
        }
    },

    // ========== COURSE QUERY METHODS ==========

    // Find course by ID with instructor and category info (for instructor views)
    async findById(course_id) {
        return db("courses")
            .select(
                "courses.*",
                "instructor.name as instructor_name",
                "instructor.bio as instructor_bio",
                "categoryL2.categoryL2_name as category_name",
                "categoryL1.category_name as parent_category_name"
            )
            .leftJoin("instructor", "courses.instructor_id", "instructor.instructor_id")
            .leftJoin("categoryL2", "courses.category_id", "categoryL2.id")
            .leftJoin("categoryL1", "categoryL2.categoryL1_id", "categoryL1.id")
            .where("courses.course_id", course_id)
            .first();
    },

    // Get detailed course info with videos (for student views)
    async getCourseById(courseId) {
        try {
            const course = await db("courses")
                .join("instructor", db.raw("CAST(courses.instructor_id AS INTEGER)"), "instructor.instructor_id")
                .join("categoryL2", "courses.category_id", "categoryL2.id")
                .where("courses.course_id", courseId)
                .select(
                    "courses.*",
                    "instructor.name as instructor_name",
                    "categoryL2.categoryL2_name as category_name"
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

    // Find courses by instructor
    async findByInstructor(instructor_id) {
        return db("courses").where({ instructor_id }).orderBy("latest_update", "desc");
    },

    // Find all courses with pagination and filtering
    async findAll({ limit = 10, offset = 0, category_id = null } = {}) {
        let query = db("courses")
            .select(
                "courses.*", 
                "instructor.name as instructor_name", 
                "categoryL2.categoryL2_name as category_name"
            )
            .leftJoin("instructor", "courses.instructor_id", "instructor.instructor_id")
            .leftJoin("categoryL2", "courses.category_id", "categoryL2.id")
            .limit(limit)
            .offset(offset);

        if (category_id) {
            query = query.where("courses.category_id", category_id);
        }

        return query;
    },

    // Get courses with instructor name (for course lists)
    async getCourseWithInstructorName(limit, offset, categoryId = 0) {
        const query = db('courses')
            .leftJoin('instructor', 'courses.instructor_id', 'instructor.instructor_id')
            .leftJoin('categoryL2', 'courses.category_id', 'categoryL2.id')
            .select(
                'courses.*', 
                'instructor.name as instructor_name',
                'categoryL2.categoryL2_name as category_name'
            )
            .orderBy('courses.latest_update', 'desc')
            .limit(limit)
            .offset(offset);

        if (categoryId && categoryId !== 0) {
            query.where('courses.category_id', categoryId);
        }

        return query;
    },

    // Get courses with advanced filtering
    async getCoursesWithFilter(filters = {}) {
        try {
            let query = db("courses")
                .join("instructor", db.raw("CAST(courses.instructor_id AS INTEGER)"), "instructor.instructor_id")
                .join("categoryL2", "courses.category_id", "categoryL2.id")
                .select(
                    "courses.*",
                    "instructor.name as instructor_name",
                    "categoryL2.categoryL2_name as category_name"
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
                query = query.where("courses.current_price", ">=", filters.price_min);
            }

            if (filters.price_max) {
                query = query.where("courses.current_price", "<=", filters.price_max);
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
    },

    // ========== SEARCH FUNCTIONALITY ==========

    // Simple search with ilike
    async searchCourses(searchTerm, { limit = 10, offset = 0 } = {}) {
        return db("courses")
            .select(
                "courses.*", 
                "instructor.name as instructor_name", 
                "categoryL2.categoryL2_name as category_name"
            )
            .leftJoin("instructor", "courses.instructor_id", "instructor.instructor_id")
            .leftJoin("categoryL2", "courses.category_id", "categoryL2.id")
            .where("courses.title", "ilike", `%${searchTerm}%`)
            .orWhere("courses.description", "ilike", `%${searchTerm}%`)
            .orWhere("categoryL2.categoryL2_name", "ilike", `%${searchTerm}%`)
            .limit(limit)
            .offset(offset);
    },

    // Full-text search (master branch version)
    async search(keyword) {
        try {
            return db("courses")
                .whereRaw(`fts @@ to_tsquery(remove_accent(?))`, [keyword]);
        } catch (error) {
            console.error("Error getting courses with filter:", error);
            throw error;
        }
    },

    // ========== VIDEO MANAGEMENT ==========

    // Get course videos
    async getCourseVideos(courseId) {
        try {
            const videos = await db("video")
                .join("lecture", "video.lecture_id", "lecture.id")
                .where("lecture.course_id", courseId)
                .orderBy("lecture.created_at", "asc");
            return videos;
        } catch (error) {
            console.error("Error getting course videos:", error);
            throw error;
        }
    },

    // Get video by ID
    async getVideoById(videoId) {
        try {
            const video = await db("video")
                .join("lecture", "video.lecture_id", "lecture.id")
                .join("courses", "lecture.course_id", "courses.course_id")
                .where("video.id", videoId)
                .select(
                    "video.*",
                    "lecture.title as lecture_title",
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

    // Get next video in course
    async getNextVideo(courseId, currentVideoOrder) {
        try {
            const video = await db("video")
                .join("lecture", "video.lecture_id", "lecture.id")
                .where("lecture.course_id", courseId)
                .where("video.order_index", ">", currentVideoOrder)
                .orderBy("video.order_index", "asc")
                .first();
            return video;
        } catch (error) {
            console.error("Error getting next video:", error);
            throw error;
        }
    },

    // Get previous video in course
    async getPreviousVideo(courseId, currentVideoOrder) {
        try {
            const video = await db("video")
                .join("lecture", "video.lecture_id", "lecture.id")
                .where("lecture.course_id", courseId)
                .where("video.order_index", "<", currentVideoOrder)
                .orderBy("video.order_index", "desc")
                .first();
            return video;
        } catch (error) {
            console.error("Error getting previous video:", error);
            throw error;
        }
    },

    // ========== CATEGORY MANAGEMENT ==========

    // Get all categories with parent information
    async getCategories() {
        return db("categoryL2")
            .select(
                "categoryL2.*", 
                "categoryL1.category_name as parent_name"
            )
            .leftJoin("categoryL1", "categoryL2.categoryL1_id", "categoryL1.id")
            .orderBy("categoryL1.category_name", "asc")
            .orderBy("categoryL2.categoryL2_name", "asc");
    },

    // Count courses by category
    async countByCategory(categoryId) {
        const q = db('courses').count('course_id as amount');
        if (categoryId && categoryId !== 0) q.where('category_id', categoryId);
        const row = await q.first();
        return parseInt(row.amount, 10) || 0;
    },

    // Find by category ID
    async findById(id) {
        return db('courses').where('category_id', id).first();
    },

    // Count courses by category ID
    async countById(id) {
        return db('courses').where('category_id', id).count('category_id as amount').first();
    },

    // ========== INSTRUCTOR STATISTICS ==========

    // Count courses by instructor
    async countByInstructor(instructor_id) {
        const result = await db("courses")
            .where({ instructor_id })
            .count("* as count")
            .first();
        return result.count;
    },

    // Update student count for a course
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

    // ========== ADMIN FUNCTIONALITY ==========

    // Find all courses for admin with joined data
    async findAllAdmin() {
        return db('courses')
            .join('instructor', 'courses.instructor_id', 'instructor.instructor_id')
            .join('categoryL2', 'courses.category_id', 'categoryL2.id')
            .select(
                'courses.course_id as id',
                'courses.title',
                'courses.is_complete',
                'courses.current_price as price',
                'instructor.name as lecturer_name',
                'categoryL2.categoryL2_name as category_name'
            );
    },

    // Count all courses
    async countAll() {
        const result = await db('courses').count('course_id as total');
        return result[0].total;
    },

    // ========== HOMEPAGE & FEATURED COURSES ==========

    // Random 4 courses for banner
    async find4RandomCourseForBanner() {
        return db('courses')
            .leftJoin('instructor', 'courses.instructor_id', 'instructor.instructor_id')
            .leftJoin('categoryL2', 'courses.category_id', 'categoryL2.id')
            .select(
                'courses.*',
                'instructor.name as instructor_name',
                'categoryL2.categoryL2_name as category_name'
            )
            .orderByRaw('RANDOM()')
            .limit(4);
    },

    // Top 4 courses with highest rating in last 7 days
    async find4CourseWithHighestRatingWEEKWithInstructorName() {
        return db('courses')
            .leftJoin('instructor', 'courses.instructor_id', 'instructor.instructor_id')
            .leftJoin('categoryL2', 'courses.category_id', 'categoryL2.id')
            .select(
                'courses.*',
                'instructor.name as instructor_name',
                'categoryL2.categoryL2_name as category_name'
            )
            .where('courses.latest_update', '>=', db.raw("CURRENT_DATE - INTERVAL '7 day'"))
            .orderBy('courses.rating', 'desc')
            .limit(4);
    },

    // Top 10 courses with highest reviews
    async find10CourseWithHighestReviewsWithInstructorName() {
        return db('courses')
            .leftJoin('instructor', 'courses.instructor_id', 'instructor.instructor_id')
            .leftJoin('categoryL2', 'courses.category_id', 'categoryL2.id')
            .select(
                'courses.*',
                'instructor.name as instructor_name',
                'categoryL2.categoryL2_name as category_name'
            )
            .orderBy('courses.total_reviews', 'desc')
            .limit(10);
    },

    // Latest 10 courses
    async find10LatestCourseWithInstructorName() {
        return db('courses')
            .leftJoin('instructor', 'courses.instructor_id', 'instructor.instructor_id')
            .leftJoin('categoryL2', 'courses.category_id', 'categoryL2.id')
            .select(
                'courses.*',
                'instructor.name as instructor_name',
                'categoryL2.categoryL2_name as category_name'
            )
            .orderBy('courses.latest_update', 'desc')
            .limit(10);
    },

    // Basic findAll without pagination
    async findAll() {
        return db('courses');
    },

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
    },

    /**
     * Lấy tất cả khóa học cho trang admin
     * Nối 3 bảng: courses, instructor (để lấy tên GV), categoryL2 (để lấy tên danh mục)
     */
    async findAllAdmin() {
        return db('courses')
            .join('instructor', 'courses.instructor_id', 'instructor.instructor_id')
            .join('categoryL2', 'courses.category_id', 'categoryL2.id')
            .select(
                'courses.course_id as id', // Đổi tên cột 'course_id' thành 'id'
                'courses.title',
                'courses.is_complete',
                'courses.current_price as price',
                'instructor.name as lecturer_name', // Lấy tên từ bảng instructor
                'categoryL2.category_name'
            );
    },

    /**
     * Gỡ bỏ một khóa học (Yêu cầu 4.2)
     * Phải xóa dữ liệu ở các bảng con trước vì có RÀNG BUỘC KHÓA NGOẠI
     */
    async delete(id) {
        try {
            // 1. Xóa feedback
            await db('feedback').where('course', id).del();

            // 2. Xóa enrollment (đăng ký học)
            await db('enrollment').where('course_id', id).del();

            // 3. Xóa watchlist (yêu thích)
            await db('watchlist_course').where('course_id', id).del();

            // 4. Xóa lectures và các video/process liên quan (cascade)
            const lectures = await db('lecture').where('course_id', id).select('id');
            const lectureIds = lectures.map(l => l.id);

            if (lectureIds.length > 0) {
                // 4a. Get all video IDs
                const videos = await db('video').whereIn('lecture_id', lectureIds).select('id');
                const videoIds = videos.map(v => v.id);

                if (videoIds.length > 0) {
                    // 4b. Delete video_process
                    await db('video_process').whereIn('video_id', videoIds).del();
                    // 4c. Delete videos
                    await db('video').whereIn('id', videoIds).del();
                }
                // 4d. Delete lectures
                await db('lecture').whereIn('id', lectureIds).del();
            }

            // 5. Cuối cùng, xóa khóa học
            await db('courses').where('course_id', id).del();

            return true; // Trả về true nếu thành công
        } catch (error) {
            console.error("Lỗi khi xóa khóa học:", error);
            return false; // Trả về false nếu thất bại
        }
    },

    async countAll() {
        const result = await db('courses').count('course_id as total');
        return result[0].total;
    },

    // Random 4 courses for banner
    async find4RandomCourseForBanner() {
        return db('courses')
            .leftJoin('instructor', 'courses.instructor_id', 'instructor.instructor_id')
            .leftJoin('categoryL2', 'courses.category_id', 'categoryL2.id')
            .select(
                'courses.*',
                'instructor.name as instructor_name',
                'categoryL2.category_name as category_name'
            )
            .orderByRaw('RANDOM()')
            .limit(4);
    },

    // Top 4 courses with highest rating in last 7 days
    async find4CourseWithHighestRatingWEEKWithInstructorName() {
        return db('courses')
            .leftJoin('instructor', 'courses.instructor_id', 'instructor.instructor_id')
            .leftJoin('categoryL2', 'courses.category_id', 'categoryL2.id')
            .select(
                'courses.*',
                'instructor.name as instructor_name',
                'categoryL2.category_name as category_name'
            )
            .where('courses.latest_update', '>=', db.raw("CURRENT_DATE - INTERVAL '7 day'"))
            .orderBy('courses.rating', 'desc')
            .limit(4);
    },

    // Top 10 courses with highest reviews
    async find10CourseWithHighestReviewsWithInstructorName() {
        return db('courses')
            .leftJoin('instructor', 'courses.instructor_id', 'instructor.instructor_id')
            .leftJoin('categoryL2', 'courses.category_id', 'categoryL2.id')
            .select(
                'courses.*',
                'instructor.name as instructor_name',
                'categoryL2.category_name as category_name'
            )
            .orderBy('courses.total_reviews', 'desc')
            .limit(10);
    },

    // Latest 10 courses
    async find10LatestCourseWithInstructorName() {
        return db('courses')
            .leftJoin('instructor', 'courses.instructor_id', 'instructor.instructor_id')
            .leftJoin('categoryL2', 'courses.category_id', 'categoryL2.id')
            .select(
                'courses.*',
                'instructor.name as instructor_name',
                'categoryL2.category_name as category_name'
            )
            .orderBy('courses.latest_update', 'desc')
            .limit(10);
    },

    async findById(id) {
        return db('courses').where('category_id', id).first();
    },

    async countById(id) {
        return db('courses').where('category_id', id).count('category_id as amount').first();
    },

    async getCourseWithInstructorName(limit, offset, categoryId = 0) {
        const query = db('courses')
            .leftJoin('instructor', 'courses.instructor_id', 'instructor.instructor_id')
            .leftJoin('categoryL2', 'courses.category_id', 'categoryL2.id')
            .select('courses.*', 'instructor.name as instructor_name',
                'categoryL2.category_name as category_name'
            )
            .orderBy('courses.latest_update', 'desc')
            .limit(limit)
            .offset(offset);

        if (categoryId && categoryId !== 0) {
            query.where('courses.category_id', categoryId);
        }

        return query;
    },

    async countByCategory(categoryId) {
        const q = db('courses').count('course_id as amount');
        if (categoryId && categoryId !== 0) q.where('category_id', categoryId);
        const row = await q.first();
        // row.amount might be a string depending on DB driver; convert to number
        return parseInt(row.amount, 10) || 0;
    },

    async findAll() {
        return db('courses');
    }
}