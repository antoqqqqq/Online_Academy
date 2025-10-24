import express from "express";
import feedbackController from "../controller/feedback.controller.js";
import { requireEnrollment, requireNoFeedback, requireExistingFeedback, requireFeedbackOwnership } from "../middlewares/feedback.mdw.js";

const router = express.Router();

/**
 * Xem danh sách đánh giá của học viên
 * GET /feedback/my-feedbacks
 * Yêu cầu: Đã đăng nhập
 */
router.get("/my-feedbacks", feedbackController.viewMyFeedbacks);

// ==========================
// FEEDBACK ROUTES
// ==========================

/**
 * Hiển thị form đánh giá khóa học
 * GET /feedback/:id
 * Yêu cầu: Đã đăng ký khóa học
 */
router.get("/:id", requireEnrollment, feedbackController.showFeedbackForm);

/**
 * Submit đánh giá mới
 * POST /feedback/:id
 * Yêu cầu: Đã đăng ký khóa học + Chưa đánh giá
 */
router.post("/:id", requireEnrollment, requireNoFeedback, feedbackController.submitFeedback);

/**
 * Cập nhật đánh giá đã có
 * PUT /feedback/:id/:feedbackId
 * Yêu cầu: Đã đăng ký khóa học + Đã đánh giá + Sở hữu đánh giá
 */
router.put("/:id/:feedbackId", requireEnrollment, requireExistingFeedback, requireFeedbackOwnership, feedbackController.updateFeedback);

/**
 * Xóa đánh giá
 * DELETE /feedback/:id/:feedbackId
 * Yêu cầu: Đã đăng ký khóa học + Đã đánh giá + Sở hữu đánh giá
 */
router.delete("/:id/:feedbackId", requireEnrollment, requireExistingFeedback, requireFeedbackOwnership, feedbackController.deleteFeedback);

/**
 * Lấy danh sách đánh giá của khóa học (API)
 * GET /feedback/:id/list
 * Không yêu cầu đăng nhập
 */
router.get("/:id/list", feedbackController.getCourseFeedbacks);

/**
 * Lấy đánh giá của học viên cho một khóa học (API)
 * GET /feedback/:id/my
 * Yêu cầu: Đã đăng nhập
 */
router.get("/:id/my", feedbackController.getStudentFeedback);

export default router;
