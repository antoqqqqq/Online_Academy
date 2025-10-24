import db from '../utils/db.js';

export default {
    /**
     * Kiểm tra xem khóa học đã có trong watchlist chưa
     */
    async isInWatchlist(userId, courseId) {
        const result = await db('watchlist_course')
            .where('student_id', userId)
            .where('course_id', courseId)
            .first();
        return !!result;
    },

    /**
     * Thêm khóa học vào watchlist
     */
    async add(userId, courseId) {
        try {
            // Kiểm tra xem đã tồn tại chưa
            const exists = await this.isInWatchlist(userId, courseId);
            if (exists) {
                return { success: false, message: 'Khóa học đã có trong danh sách yêu thích' };
            }

            await db('watchlist_course').insert({
                student_id: userId,
                course_id: courseId,
                created_at: new Date()
            });

            return { success: true, message: 'Đã thêm vào danh sách yêu thích' };
        } catch (error) {
            console.error('Lỗi khi thêm vào watchlist:', error);
            return { success: false, message: 'Có lỗi xảy ra' };
        }
    },

    /**
     * Xóa khóa học khỏi watchlist
     */
    async remove(userId, courseId) {
        try {
            await db('watchlist_course')
                .where('student_id', userId)
                .where('course_id', courseId)
                .del();

            return { success: true, message: 'Đã xóa khỏi danh sách yêu thích' };
        } catch (error) {
            console.error('Lỗi khi xóa khỏi watchlist:', error);
            return { success: false, message: 'Có lỗi xảy ra' };
        }
    },

    /**
     * Toggle watchlist - Thêm nếu chưa có, xóa nếu đã có
     */
    async toggle(userId, courseId) {
        const exists = await this.isInWatchlist(userId, courseId);
        if (exists) {
            return await this.remove(userId, courseId);
        } else {
            return await this.add(userId, courseId);
        }
    },

    /**
     * Lấy danh sách khóa học yêu thích của user
     */
    async getByUserId(userId, limit = 10, offset = 0) {
        try {
            return await db('watchlist_course')
                .join('courses', 'watchlist_course.course_id', 'courses.course_id')
                .leftJoin('instructor', 'courses.instructor_id', 'instructor.instructor_id')
                .leftJoin('categoryL2', 'courses.category_id', 'categoryL2.id')
                .where('watchlist_course.student_id', userId)
                .select(
                    'courses.*',
                    'instructor.name as instructor_name',
                    'categoryL2.category_name as category_name',
                    'watchlist_course.created_at as added_at'
                )
                .orderBy('watchlist_course.created_at', 'desc')
                .limit(limit)
                .offset(offset);
        } catch (error) {
            console.error('Lỗi khi lấy watchlist:', error);
            return [];
        }
    },

    /**
     * Đếm số lượng khóa học trong watchlist
     */
    async countByUserId(userId) {
        const result = await db('watchlist_course')
            .where('student_id', userId)
            .count('id as total')
            .first();
        return parseInt(result.total, 10) || 0;
    }
};

