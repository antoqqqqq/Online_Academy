import enrollmentModel from "../models/enrollment.model.js";

/**
 * Middleware kiểm tra học viên đã đăng ký khóa học
 * Chỉ cho phép học viên đã đăng ký mới có thể đánh giá
 */
export const requireEnrollment = async (req, res, next) => {
    try {
        const courseId = req.params.id;
        const userId = req.session.authUser?.id;

        // Kiểm tra đăng nhập
        if (!userId) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: false,
                    message: 'Vui lòng đăng nhập để sử dụng tính năng này',
                    requireLogin: true
                });
            }
            return res.redirect('/account/signin');
        }

        // Kiểm tra học viên đã đăng ký khóa học chưa
        const isEnrolled = await enrollmentModel.isEnrolled(userId, courseId);
        
        if (!isEnrolled) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: false,
                    message: 'Bạn cần đăng ký khóa học này để có thể đánh giá'
                });
            }
            return res.status(403).render('error', {
                message: 'Bạn cần đăng ký khóa học này để có thể đánh giá',
                layout: 'main'
            });
        }

        // Lưu thông tin vào request để sử dụng ở các middleware/controller tiếp theo
        req.isEnrolled = true;
        next();
    } catch (error) {
        console.error('Error in requireEnrollment middleware:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({
                success: false,
                message: 'Có lỗi xảy ra khi kiểm tra quyền truy cập'
            });
        }
        next(error);
    }
};

/**
 * Middleware kiểm tra học viên chưa đánh giá khóa học
 * Chỉ cho phép học viên chưa đánh giá mới có thể tạo đánh giá mới
 */
export const requireNoFeedback = async (req, res, next) => {
    try {
        const courseId = req.params.id;
        const userId = req.session.authUser?.id;

        // Import feedbackModel ở đây để tránh circular dependency
        const feedbackModel = (await import("../models/feedback.model.js")).default;

        // Kiểm tra học viên đã đánh giá chưa
        const existingFeedback = await feedbackModel.getStudentFeedback(userId, courseId);
        
        if (existingFeedback) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: false,
                    message: 'Bạn đã đánh giá khóa học này rồi',
                    existingFeedback: existingFeedback
                });
            }
            return res.status(400).render('error', {
                message: 'Bạn đã đánh giá khóa học này rồi',
                layout: 'main'
            });
        }

        next();
    } catch (error) {
        console.error('Error in requireNoFeedback middleware:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({
                success: false,
                message: 'Có lỗi xảy ra khi kiểm tra đánh giá'
            });
        }
        next(error);
    }
};

/**
 * Middleware kiểm tra học viên đã đánh giá khóa học
 * Chỉ cho phép học viên đã đánh giá mới có thể chỉnh sửa/xóa đánh giá
 */
export const requireExistingFeedback = async (req, res, next) => {
    try {
        const courseId = req.params.id;
        const userId = req.session.authUser?.id;

        // Import feedbackModel ở đây để tránh circular dependency
        const feedbackModel = (await import("../models/feedback.model.js")).default;

        // Kiểm tra học viên đã đánh giá chưa
        const existingFeedback = await feedbackModel.getStudentFeedback(userId, courseId);
        
        if (!existingFeedback) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: false,
                    message: 'Bạn chưa đánh giá khóa học này'
                });
            }
            return res.status(400).render('error', {
                message: 'Bạn chưa đánh giá khóa học này',
                layout: 'main'
            });
        }

        // Lưu thông tin đánh giá vào request
        req.existingFeedback = existingFeedback;
        next();
    } catch (error) {
        console.error('Error in requireExistingFeedback middleware:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({
                success: false,
                message: 'Có lỗi xảy ra khi kiểm tra đánh giá'
            });
        }
        next(error);
    }
};

/**
 * Middleware kiểm tra quyền sở hữu đánh giá
 * Chỉ cho phép chủ sở hữu đánh giá mới có thể chỉnh sửa/xóa
 */
export const requireFeedbackOwnership = async (req, res, next) => {
    try {
        const feedbackId = req.params.feedbackId;
        const userId = req.session.authUser?.id;

        // Import feedbackModel ở đây để tránh circular dependency
        const feedbackModel = (await import("../models/feedback.model.js")).default;

        // Import db ở đây để tránh circular dependency
        const db = (await import("../utils/db.js")).default;

        // Lấy thông tin đánh giá
        const feedback = await db('feedback')
            .where('id', feedbackId)
            .first();

        if (!feedback) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: false,
                    message: 'Không tìm thấy đánh giá'
                });
            }
            return res.status(404).render('error', {
                message: 'Không tìm thấy đánh giá',
                layout: 'main'
            });
        }

        // Kiểm tra quyền sở hữu
        if (parseInt(feedback.student) !== parseInt(userId)) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: false,
                    message: 'Bạn không có quyền chỉnh sửa đánh giá này'
                });
            }
            return res.status(403).render('error', {
                message: 'Bạn không có quyền chỉnh sửa đánh giá này',
                layout: 'main'
            });
        }

        // Lưu thông tin đánh giá vào request
        req.feedback = feedback;
        next();
    } catch (error) {
        console.error('Error in requireFeedbackOwnership middleware:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.json({
                success: false,
                message: 'Có lỗi xảy ra khi kiểm tra quyền sở hữu'
            });
        }
        next(error);
    }
};
