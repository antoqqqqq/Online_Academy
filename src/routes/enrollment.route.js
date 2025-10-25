import express from "express";
import enrollmentController from "../controller/enrollment.controller.js";
import { requireEnrollment, requireLogin } from "../middlewares/enrollment.mdw.js";

const router = express.Router();

// Đăng ký khóa học
router.post('/:id/enroll', requireLogin, enrollmentController.enroll);

// Kiểm tra trạng thái đăng ký
router.get('/:id/enrollment-status', enrollmentController.checkEnrollment);

// Xem trang "Khóa học của tôi"
router.get('/my-courses', requireLogin, enrollmentController.myCourses);

// Xem khóa học đã đăng ký (với danh sách chương)
router.get('/:id/learn', requireEnrollment, enrollmentController.viewCourse);

// Xem video của một chương cụ thể
router.get('/:courseId/learn/:lectureId', requireEnrollment, enrollmentController.viewLecture);

// API lưu tiến độ video
router.post('/video/progress', requireLogin, enrollmentController.saveVideoProgress);

// API đánh dấu video hoàn thành
router.post('/video/complete', requireLogin, enrollmentController.markVideoCompleted);

export default router;
