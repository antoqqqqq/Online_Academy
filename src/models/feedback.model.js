import db from '../utils/db.js';

export default {
    /**
     * Thêm đánh giá mới cho khóa học
     * @param {number} studentId - ID của học viên
     * @param {number} courseId - ID của khóa học
     * @param {number} rating - Điểm đánh giá (1-5)
     * @param {string} comment - Nội dung phản hồi
     * @returns {Object} Kết quả thêm đánh giá
     */
    async addFeedback(studentId, courseId, rating, comment) {
        try {
            // Kiểm tra xem học viên đã đánh giá khóa học này chưa
            const existingFeedback = await db('feedback')
                .where('student', studentId)
                .where('course', courseId)
                .first();

            if (existingFeedback) {
                return {
                    success: false,
                    message: 'Bạn đã đánh giá khóa học này rồi'
                };
            }

            // Thêm đánh giá mới
            const feedback = await db('feedback').insert({
                student: studentId,
                course: courseId,
                rating: rating,
                feedback: comment,
                created_at: new Date()
            }).returning('*');

            // Cập nhật điểm đánh giá trung bình của khóa học
            await this.updateCourseRating(courseId);

            return {
                success: true,
                message: 'Cảm ơn bạn đã đánh giá khóa học!',
                feedback: feedback[0]
            };
        } catch (error) {
            console.error('Error adding feedback:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi thêm đánh giá'
            };
        }
    },

    /**
     * Cập nhật đánh giá đã có
     * @param {number} feedbackId - ID của đánh giá
     * @param {number} studentId - ID của học viên
     * @param {number} rating - Điểm đánh giá mới
     * @param {string} comment - Nội dung phản hồi mới
     * @returns {Object} Kết quả cập nhật
     */
    async updateFeedback(feedbackId, studentId, rating, comment) {
        try {
            const result = await db('feedback')
                .where('id', feedbackId)
                .where('student', studentId)
                .update({
                    rating: rating,
                    feedback: comment
                }).returning('*');

            if (result.length === 0) {
                return {
                    success: false,
                    message: 'Không tìm thấy đánh giá hoặc bạn không có quyền chỉnh sửa'
                };
            }

            // Cập nhật điểm đánh giá trung bình của khóa học
            await this.updateCourseRating(result[0].course);

            return {
                success: true,
                message: 'Cập nhật đánh giá thành công!',
                feedback: result[0]
            };
        } catch (error) {
            console.error('Error updating feedback:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật đánh giá'
            };
        }
    },

    /**
     * Xóa đánh giá
     * @param {number} feedbackId - ID của đánh giá
     * @param {number} studentId - ID của học viên
     * @returns {Object} Kết quả xóa
     */
    async deleteFeedback(feedbackId, studentId) {
        try {
            const feedback = await db('feedback')
                .where('id', feedbackId)
                .where('student', studentId)
                .first();

            if (!feedback) {
                return {
                    success: false,
                    message: 'Không tìm thấy đánh giá hoặc bạn không có quyền xóa'
                };
            }

            await db('feedback')
                .where('id', feedbackId)
                .where('student', studentId)
                .del();

            // Cập nhật điểm đánh giá trung bình của khóa học
            await this.updateCourseRating(feedback.course);

            return {
                success: true,
                message: 'Xóa đánh giá thành công!'
            };
        } catch (error) {
            console.error('Error deleting feedback:', error);
            return {
                success: false,
                message: 'Có lỗi xảy ra khi xóa đánh giá'
            };
        }
    },

    /**
     * Lấy đánh giá của học viên cho một khóa học
     * @param {number} studentId - ID của học viên
     * @param {number} courseId - ID của khóa học
     * @returns {Object|null} Đánh giá của học viên
     */
    async getStudentFeedback(studentId, courseId) {
        try {
            const feedback = await db('feedback')
                .join('account', 'feedback.student', 'account.id')
                .where('feedback.student', studentId)
                .where('feedback.course', courseId)
                .select(
                    'feedback.*',
                    'account.name as student_name',
                    'account.email as student_email'
                )
                .first();

            return feedback || null;
        } catch (error) {
            console.error('Error getting student feedback:', error);
            return null;
        }
    },

    /**
     * Lấy tất cả đánh giá của một khóa học
     * @param {number} courseId - ID của khóa học
     * @param {number} limit - Số lượng đánh giá tối đa
     * @param {number} offset - Vị trí bắt đầu
     * @returns {Array} Danh sách đánh giá
     */
    async getCourseFeedbacks(courseId, limit = 10, offset = 0) {
        try {
            const feedbacks = await db('feedback')
                .join('account', 'feedback.student', 'account.id')
                .where('feedback.course', courseId)
                .select(
                    'feedback.*',
                    'account.name as student_name',
                    'account.email as student_email'
                )
                .orderBy('feedback.created_at', 'desc')
                .limit(limit)
                .offset(offset);

            return feedbacks;
        } catch (error) {
            console.error('Error getting course feedbacks:', error);
            return [];
        }
    },

    /**
     * Đếm số lượng đánh giá của một khóa học
     * @param {number} courseId - ID của khóa học
     * @returns {number} Số lượng đánh giá
     */
    async countCourseFeedbacks(courseId) {
        try {
            const result = await db('feedback')
                .where('course', courseId)
                .count('* as total')
                .first();

            return parseInt(result.total) || 0;
        } catch (error) {
            console.error('Error counting course feedbacks:', error);
            return 0;
        }
    },

    /**
     * Lấy thống kê đánh giá của một khóa học
     * @param {number} courseId - ID của khóa học
     * @returns {Object} Thống kê đánh giá
     */
    async getCourseRatingStats(courseId) {
        try {
            const stats = await db('feedback')
                .where('course', courseId)
                .select(
                    db.raw('AVG(rating) as average_rating'),
                    db.raw('COUNT(*) as total_reviews'),
                    db.raw('COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star'),
                    db.raw('COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star'),
                    db.raw('COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star'),
                    db.raw('COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star'),
                    db.raw('COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star')
                )
                .first();

            return {
                average_rating: parseFloat(stats.average_rating || 0).toFixed(1),
                total_reviews: parseInt(stats.total_reviews || 0),
                five_star: parseInt(stats.five_star || 0),
                four_star: parseInt(stats.four_star || 0),
                three_star: parseInt(stats.three_star || 0),
                two_star: parseInt(stats.two_star || 0),
                one_star: parseInt(stats.one_star || 0)
            };
        } catch (error) {
            console.error('Error getting course rating stats:', error);
            return {
                average_rating: 0,
                total_reviews: 0,
                five_star: 0,
                four_star: 0,
                three_star: 0,
                two_star: 0,
                one_star: 0
            };
        }
    },

    /**
     * Cập nhật điểm đánh giá trung bình của khóa học
     * @param {number} courseId - ID của khóa học
     */
    async updateCourseRating(courseId) {
        try {
            const stats = await this.getCourseRatingStats(courseId);
            
            await db('courses')
                .where('course_id', courseId)
                .update({
                    rating: parseFloat(stats.average_rating),
                    total_reviews: stats.total_reviews
                });
        } catch (error) {
            console.error('Error updating course rating:', error);
        }
    },

    /**
     * Lấy danh sách đánh giá của học viên
     * @param {number} studentId - ID của học viên
     * @param {number} limit - Số lượng đánh giá tối đa
     * @param {number} offset - Vị trí bắt đầu
     * @returns {Array} Danh sách đánh giá của học viên
     */
    async getStudentFeedbacks(studentId, limit = 10, offset = 0) {
        try {
            const feedbacks = await db('feedback')
                .join('courses', 'feedback.course', 'courses.course_id')
                .join('instructor', db.raw("CAST(courses.instructor_id AS INTEGER)"), 'instructor.instructor_id')
                .join('categoryL2', 'courses.category_id', 'categoryL2.id')
                .where('feedback.student', studentId)
                .select(
                    'feedback.*',
                    'courses.title as course_title',
                    'courses.image_url as course_image',
                    'instructor.name as instructor_name',
                    'categoryL2.category_name'
                )
                .orderBy('feedback.created_at', 'desc')
                .limit(limit)
                .offset(offset);

            return feedbacks;
        } catch (error) {
            console.error('Error getting student feedbacks:', error);
            return [];
        }
    },

    /**
     * Đếm số lượng đánh giá của học viên
     * @param {number} studentId - ID của học viên
     * @returns {number} Số lượng đánh giá
     */
    async countStudentFeedbacks(studentId) {
        try {
            const result = await db('feedback')
                .where('student', studentId)
                .count('* as total')
                .first();

            return parseInt(result.total) || 0;
        } catch (error) {
            console.error('Error counting student feedbacks:', error);
            return 0;
        }
    }
};
