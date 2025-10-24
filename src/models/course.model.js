import db from '../utils/db.js';

export default {

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
    // courseModel.js
    //  Random 4 courses for banner
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
    //  Top 4 courses with highest rating in last 7 days
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

    //  Top 10 courses with highest reviews
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

    //  Latest 10 courses
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
    // inside courseModel.js
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
    async getCourseById(id) {
        // models/course.model.js
        // Fetch course details with instructor & category
        const course = await db('courses as c')
            .leftJoin('instructor as i', 'c.instructor_id', 'i.instructor_id')
            .leftJoin('categoryL2 as l2', 'c.category_id', 'l2.id')
            .leftJoin('categoryL1 as l1', 'l2.categoryL1_id', 'l1.id')
            .select(
                'c.course_id',
                'c.title',
                'c.description',
                'c.image_url',
                'c.rating',
                'c.total_reviews',
                'c.total_hours',
                'c.total_lectures',
                'c.level',
                'c.current_price',
                'c.original_price',
                'c.is_complete',
                'c.latest_update',
                'c.full_description',
                'c.total_enrollment',
                'c.is_onsale',
                'l1.category_name as categoryL1_name',
                'l2.category_name as categoryL2_name',
                'i.instructor_id',
                'i.name as instructor_name',
                'i.bio as instructor_bio',
                'i.total_students as instructor_total_students'
            )
            .where('c.course_id', id)
            .first();
        if (!course) return null;

        return course;
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


}

