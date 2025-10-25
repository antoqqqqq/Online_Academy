import enrollmentModel from '../models/enrollment.model.js';

/**
 * Middleware kiểm tra học viên đã đăng ký khóa học chưa
 */
export const requireEnrollment = async (req, res, next) => {
    try {
        // Kiểm tra đăng nhập
        if (!req.session.authUser) {
            return res.status(401).render('error', {
                message: 'Vui lòng đăng nhập để truy cập nội dung này',
                layout: 'main'
            });
        }

        const courseId = req.params.id || req.params.courseId;
        const studentId = req.session.authUser.id;

        if (!courseId) {
            return res.status(400).render('error', {
                message: 'Thiếu thông tin khóa học',
                layout: 'main'
            });
        }

        // Kiểm tra đăng ký
        const isEnrolled = await enrollmentModel.isEnrolled(studentId, courseId);
        
        if (!isEnrolled) {
            return res.status(403).render('error', {
                message: 'Bạn chưa đăng ký khóa học này. Vui lòng đăng ký để truy cập nội dung.',
                layout: 'main'
            });
        }

        // Thêm thông tin enrollment vào request
        req.enrollment = {
            courseId,
            studentId,
            isEnrolled: true
        };

        next();
    } catch (error) {
        console.error('Error in requireEnrollment middleware:', error);
        return res.status(500).render('error', {
            message: 'Có lỗi xảy ra khi kiểm tra quyền truy cập',
            layout: 'main'
        });
    }
};

/**
 * Middleware kiểm tra đăng nhập (optional)
 */
export const requireLogin = (req, res, next) => {
    if (!req.session.authUser) {
        return res.status(401).render('error', {
            message: 'Vui lòng đăng nhập để sử dụng tính năng này',
            layout: 'main'
        });
    }
    next();
};

export default {
    requireEnrollment,
    requireLogin
};
