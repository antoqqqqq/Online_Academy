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
                    "instructor.bio as instructor_bio_raw",
                    "instructor.total_students as instructor_student_count",
                    "categoryL2.category_name as category_name"
                )
                .first();
            
            if (!course) return null;

            if (!course.image_url || course.image_url === '' || course.image_url === '/upload/images/default-course.jpg' || course.image_url === '/src/public/upload/images/default-course.jpg') {
                course.image_url = '/static/default/default-course.jpg';
            }

            // Parse enhanced instructor data from bio field
            let instructor_bio = '';
            let instructor_expertise = '';

            if (course.instructor_bio_raw) {
                try {
                    const parsedBio = JSON.parse(course.instructor_bio_raw);
                    if (typeof parsedBio === 'object' && parsedBio !== null) {
                        instructor_bio = parsedBio.bio_text || parsedBio.original_bio || '';
                        instructor_expertise = parsedBio.expertise || '';
                    } else {
                        instructor_bio = course.instructor_bio_raw;
                    }
                } catch (e) {
                    instructor_bio = course.instructor_bio_raw;
                }
            }

            // Add parsed instructor data to course object
            course.instructor_bio = instructor_bio;
            course.instructor_expertise = instructor_expertise;

            // Get instructor's course count
            const courseCountResult = await db('courses')
                .where('instructor_id', course.instructor_id)
                .count('course_id as count')
                .first();
            course.instructor_course_count = parseInt(courseCountResult.count) || 0;

            // Calculate instructor rating
            const ratingResult = await db('courses')
                .where('instructor_id', course.instructor_id)
                .avg('rating as average')
                .first();
            course.instructor_rating = parseFloat(ratingResult.average || 0).toFixed(1);

            // Get other courses by this instructor
            const otherCourses = await db('courses')
                .where('instructor_id', course.instructor_id)
                .where('course_id', '!=', courseId)
                .select('course_id', 'title', 'image_url', 'rating', 'total_enrollment')
                .orderBy('total_enrollment', 'desc')
                .limit(4);
            
            // Fix other courses image URLs
            course.other_courses = otherCourses.map(otherCourse => ({
                ...otherCourse,
                image_url: otherCourse.image_url && otherCourse.image_url !== '' && otherCourse.image_url !== '/upload/images/default-course.jpg' && otherCourse.image_url !== '/src/public/upload/images/default-course.jpg' ? 
                    otherCourse.image_url : '/static/default/default-course.jpg'
            }));

            // Parse full_description if it exists
            if (course.full_description && typeof course.full_description === 'string') {
                try {
                    course.full_description = JSON.parse(course.full_description);
                } catch (error) {
                    console.log('Failed to parse full_description as JSON, using as-is');
                }
            }

            // Get course videos
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
    },

    async findFeedback(id) {
        const feedback = await db('feedback as f')
            .leftJoin('student as s', 'f.student', 's.id')
            .where('f.course', id)
            .select(
                'f.id',
                'f.rating',
                'f.feedback',
                'f.created_at',
                's.id as student_id',
                db.raw(`'Student ' || s.id as student_name`),
            )
            .orderBy('f.created_at', 'desc');
        return feedback;
    },
    async findRelated(id) {
        // Step 1: Get the category of the target course
        const course = await db('courses')
            .select('category_id')
            .where('course_id', id)
            .first();

        if (!course || !course.category_id) return [];

        // Step 2: Find top 5 other courses in same category
        const related = await db('courses as c')
            .leftJoin('instructor as i', 'c.instructor_id', 'i.instructor_id')
            .where('c.category_id', course.category_id)
            .andWhereNot('c.course_id', id)
            .orderBy('c.total_enrollment', 'desc')
            .limit(5)
            .select(
                'c.*', // ✅ all columns from courses
                'i.name as instructor_name' // ✅ instructor’s name
            );

        return related;
    },

    // Get next available course_id
    async getNextCourseId() {
        const maxResult = await db('courses')
            .max('course_id as max_id')
            .first();
        return (maxResult.max_id || 0) + 1;
    },

    // Create course with manual ID handling
    async createWithId(courseData) {
        // Get next ID if not provided
        if (!courseData.course_id) {
            courseData.course_id = await this.getNextCourseId();
        }
        
        const [newCourse] = await db('courses')
            .insert(courseData)
            .returning('*');
        
        return newCourse;
    }
};
