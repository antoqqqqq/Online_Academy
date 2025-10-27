import express from "express";
import enrollmentController from "../controller/enrollment.controller.js";
import { requireEnrollment, requireLogin } from "../middlewares/enrollment.mdw.js";

const router = express.Router();

// Middleware kiểm tra student (optional - chỉ áp dụng cho một số routes cụ thể)
const requireStudent = async (req, res, next) => {
    try {
        // Kiểm tra đăng nhập
        if (!req.session.authUser) {
            return res.redirect('/account/signin');
        }
        
        // Permission 1 = student, 0 = instructor, 2 = admin
        // Nếu permission === 1 hoặc không có permission field, cho phép
        if (req.session.authUser.permission === 1 || !req.session.authUser.permission) {
            return next();
        }
        
        // Nếu không phải student, redirect về trang chủ
        return res.redirect('/');
    } catch (error) {
        console.error('Error in requireStudent:', error);
        return res.redirect('/');
    }
};

// ============================================
// ENROLLMENT ROUTES - Phân hệ Học Viên
// ============================================

// Đăng ký khóa học (POST)
router.post('/:id/enroll', requireLogin, enrollmentController.enroll);

// Kiểm tra trạng thái đăng ký (GET)
router.get('/:id/enrollment-status', enrollmentController.checkEnrollment);

// Xem trang "Khóa học của tôi" - yêu cầu student
router.get('/my-courses', requireLogin, requireStudent, enrollmentController.myCourses);

// Xem khóa học đã đăng ký (với danh sách chương)
router.get('/:id/learn', requireEnrollment, enrollmentController.viewCourse);

// Xem video của một chương cụ thể
router.get('/:courseId/learn/:lectureId', requireEnrollment, enrollmentController.viewLecture);

// API lưu tiến độ video (POST)
router.post('/video/progress', requireLogin, enrollmentController.saveVideoProgress);

// API đánh dấu video hoàn thành (POST)
router.post('/video/complete', requireLogin, enrollmentController.markVideoCompleted);

export default router;
