import feedbackModel from "../models/feedback.model.js";
import enrollmentModel from "../models/enrollment.model.js";
import courseModel from "../models/course.model.js";

const feedbackController = {
    /**
     * Hiển thị form đánh giá khóa học
     */
    showFeedbackForm: async (req, res, next) => {
        try {
            const courseId = req.params.id;
            const userId = req.session.authUser?.id;

            // Kiểm tra đăng nhập
            if (!userId) {
                return res.redirect('/account/signin');
            }

            // Kiểm tra học viên đã đăng ký khóa học chưa
            const isEnrolled = await enrollmentModel.isEnrolled(userId, courseId);
            if (!isEnrolled) {
                return res.status(403).render('error', {
                    message: 'Bạn cần đăng ký khóa học này để có thể đánh giá'
                });
            }

            // Lấy thông tin khóa học
            const course = await courseModel.getCourseById(courseId);
            if (!course) {
                return res.status(404).render('error', {
                    message: 'Không tìm thấy khóa học'
                });
            }

            // Kiểm tra xem học viên đã đánh giá chưa
            const existingFeedback = await feedbackModel.getStudentFeedback(userId, courseId);

            res.render('vwCourse/feedback', {
                layout: 'main',
                course,
                existingFeedback,
                isLoggedIn: true
            });
        } catch (error) {
            console.error('Error showing feedback form:', error);
            next(error);
        }
    },

    /**
     * Xử lý submit đánh giá mới
     */
    submitFeedback: async (req, res) => {
        try {
            const courseId = req.params.id;
            const userId = req.session.authUser?.id;
            const { rating, comment } = req.body;

            // Kiểm tra đăng nhập
            if (!userId) {
                return res.json({
                    success: false,
                    message: 'Vui lòng đăng nhập để đánh giá',
                    requireLogin: true
                });
            }

            // Kiểm tra học viên đã đăng ký khóa học chưa
            const isEnrolled = await enrollmentModel.isEnrolled(userId, courseId);
            
            if (!isEnrolled) {
                return res.json({
                    success: false,
                    message: 'Bạn cần đăng ký khóa học này để có thể đánh giá'
                });
            }

            // Validate input
            if (!rating || rating < 1 || rating > 5) {
                return res.json({
                    success: false,
                    message: 'Điểm đánh giá phải từ 1 đến 5 sao'
                });
            }

            if (!comment || comment.trim().length < 10) {
                return res.json({
                    success: false,
                    message: 'Nội dung đánh giá phải có ít nhất 10 ký tự'
                });
            }

            // Thêm đánh giá
            const result = await feedbackModel.addFeedback(userId, courseId, parseInt(rating), comment.trim());

            return res.json(result);
        } catch (error) {
            console.error('Error submitting feedback:', error);
            console.error('Error stack:', error.stack);
            return res.json({
                success: false,
                message: 'Có lỗi xảy ra khi gửi đánh giá: ' + error.message
            });
        }
    },

    /**
     * Cập nhật đánh giá đã có
     */
    updateFeedback: async (req, res) => {
        try {
            const feedbackId = req.params.feedbackId;
            const userId = req.session.authUser?.id;
            const { rating, comment } = req.body;

            // Kiểm tra đăng nhập
            if (!userId) {
                return res.json({
                    success: false,
                    message: 'Vui lòng đăng nhập',
                    requireLogin: true
                });
            }

            // Validate input
            if (!rating || rating < 1 || rating > 5) {
                return res.json({
                    success: false,
                    message: 'Điểm đánh giá phải từ 1 đến 5 sao'
                });
            }

            if (!comment || comment.trim().length < 10) {
                return res.json({
                    success: false,
                    message: 'Nội dung đánh giá phải có ít nhất 10 ký tự'
                });
            }

            // Cập nhật đánh giá
            const result = await feedbackModel.updateFeedback(feedbackId, userId, parseInt(rating), comment.trim());

            return res.json(result);
        } catch (error) {
            console.error('Error updating feedback:', error);
            return res.json({
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật đánh giá'
            });
        }
    },

    /**
     * Xóa đánh giá
     */
    deleteFeedback: async (req, res) => {
        try {
            const feedbackId = req.params.feedbackId;
            const userId = req.session.authUser?.id;

            // Kiểm tra đăng nhập
            if (!userId) {
                return res.json({
                    success: false,
                    message: 'Vui lòng đăng nhập',
                    requireLogin: true
                });
            }

            // Xóa đánh giá
            const result = await feedbackModel.deleteFeedback(feedbackId, userId);

            return res.json(result);
        } catch (error) {
            console.error('Error deleting feedback:', error);
            return res.json({
                success: false,
                message: 'Có lỗi xảy ra khi xóa đánh giá'
            });
        }
    },

    /**
     * Lấy danh sách đánh giá của khóa học (API)
     */
    getCourseFeedbacks: async (req, res) => {
        try {
            const courseId = req.params.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            // Lấy danh sách đánh giá
            const feedbacks = await feedbackModel.getCourseFeedbacks(courseId, limit, offset);
            const total = await feedbackModel.countCourseFeedbacks(courseId);
            const totalPages = Math.ceil(total / limit);

            // Lấy thống kê đánh giá
            const stats = await feedbackModel.getCourseRatingStats(courseId);

            return res.json({
                success: true,
                data: {
                    feedbacks,
                    stats,
                    pagination: {
                        currentPage: page,
                        totalPages,
                        hasPrev: page > 1,
                        hasNext: page < totalPages,
                        total
                    }
                }
            });
        } catch (error) {
            console.error('Error getting course feedbacks:', error);
            return res.json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách đánh giá'
            });
        }
    },

    /**
     * Lấy đánh giá của học viên cho một khóa học (API)
     */
    getStudentFeedback: async (req, res) => {
        try {
            const courseId = req.params.id;
            const userId = req.session.authUser?.id;

            // Kiểm tra đăng nhập
            if (!userId) {
                return res.json({
                    success: false,
                    message: 'Vui lòng đăng nhập',
                    requireLogin: true
                });
            }

            // Lấy đánh giá của học viên
            const feedback = await feedbackModel.getStudentFeedback(userId, courseId);

            return res.json({
                success: true,
                data: feedback
            });
        } catch (error) {
            console.error('Error getting student feedback:', error);
            return res.json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy đánh giá'
            });
        }
    },

    /**
     * Xem danh sách đánh giá của học viên
     */
    viewMyFeedbacks: async (req, res, next) => {
        try {
            const userId = req.session.authUser?.id;

            // Kiểm tra đăng nhập
            if (!userId) {
                return res.redirect('/account/signin');
            }

            const page = parseInt(req.query.page) || 1;
            const limit = 10;
            const offset = (page - 1) * limit;

            // Lấy danh sách đánh giá của học viên
            const feedbacks = await feedbackModel.getStudentFeedbacks(userId, limit, offset);
            const total = await feedbackModel.countStudentFeedbacks(userId);
            const totalPages = Math.ceil(total / limit);

            res.render('vwCourse/my-feedbacks', {
                layout: 'main',
                feedbacks,
                total,
                pagination: {
                    currentPage: page,
                    totalPages,
                    hasPrev: page > 1,
                    hasNext: page < totalPages,
                    pages: Array.from({ length: totalPages }, (_, i) => ({
                        value: i + 1,
                        isCurrent: i + 1 === page
                    }))
                }
            });
        } catch (error) {
            console.error('Error viewing my feedbacks:', error);
            next(error);
        }
    }
};

export default feedbackController;
