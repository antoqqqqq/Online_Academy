// src/middlewares/enrollment.mdw.js
import enrollmentModel from '../models/enrollment.model.js';
import lectureModel from '../models/lecture.model.js'; // Thêm import lectureModel

export const requireEnrollment = async (req, res, next) => {
    try {
        // Hỗ trợ cả 2 kiểu route: '/:id/learn' và '/:courseId/learn/:lectureId'
        const courseId = req.params.courseId || req.params.id;
        const lectureId = req.params.lectureId; // Lấy từ route .../learn/:lectureId
        const studentId = req.session.authUser?.id; // Dùng optional chaining ?.

        // --- KIỂM TRA PREVIEW ---
        if (lectureId) {
            const lecture = await lectureModel.getLectureById(lectureId);
            // Nếu bài giảng tồn tại VÀ được phép xem trước
            if (lecture && lecture.is_preview) {
                return next(); // Cho phép truy cập mà không cần kiểm tra đăng ký/đăng nhập
            }
        }
        // --- KẾT THÚC KIỂM TRA PREVIEW ---

        // Nếu không phải xem trước hoặc không tìm thấy bài giảng, tiếp tục logic cũ:
        // Kiểm tra đăng nhập
        if (!studentId) {
            return res.status(401).render('error', {
                message: 'Vui lòng đăng nhập để truy cập nội dung này',
                layout: 'main'
            });
        }

        if (!courseId) {
            return res.status(400).render('error', {
                message: 'Thiếu thông tin khóa học',
                layout: 'main'
            });
        }

        // Kiểm tra đăng ký
        const isEnrolled = await enrollmentModel.isEnrolled(studentId, courseId);

        if (!isEnrolled) {
             // Nếu bài giảng cụ thể được yêu cầu và không phải preview (đã kiểm tra ở trên)
             if (lectureId) {
                 return res.status(403).render('error', {
                     message: 'Bạn chưa đăng ký khóa học này để xem bài giảng này.',
                     layout: 'main'
                 });
             } else { // Trường hợp truy cập trang tổng quan khóa học (/enrollment/:id/learn)
                 return res.status(403).render('error', {
                     message: 'Bạn chưa đăng ký khóa học này. Vui lòng đăng ký để truy cập nội dung.',
                     layout: 'main'
                 });
             }
        }

        // Thêm thông tin enrollment vào request (chỉ khi đã đăng ký)
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

export const requireLogin = (req, res, next) => {
    try {
        if (req.session && req.session.authUser) {
            return next();
        }

        // If the client expects JSON (AJAX/API), return 401 JSON instead of redirect
        const acceptsJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
        if (acceptsJson) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
        }

        return res.redirect('/account/signin');
    } catch (error) {
        console.error('Error in requireLogin middleware:', error);
        return res.status(500).render('error', {
            message: 'Có lỗi xảy ra khi xác thực đăng nhập',
            layout: 'main'
        });
    }
};

export default {
    requireEnrollment,
    requireLogin
};