import express from "express";
import instructorController from "../controller/instructor.controller.js";
import courseController from "../controller/course.controller.js";
import lectureController from "../controller/lecture.controller.js";
import { isInstructor } from "../middlewares/instructor.mdw.js";

const router = express.Router();

// Instructor dashboard and profile
router.get("/dashboard", isInstructor, instructorController.dashboard);
router.get("/profile", isInstructor, instructorController.profile);
router.post("/profile", isInstructor, instructorController.updateProfile);
router.get("/change-password", isInstructor, instructorController.changePasswordForm);
router.post("/change-password", isInstructor, instructorController.changePassword);

// Become instructor
router.get("/become-instructor", instructorController.becomeInstructorForm);
router.post("/become-instructor", instructorController.becomeInstructor);

// Course management
router.get("/courses", isInstructor, courseController.manageCourses);
router.get("/courses/create", isInstructor, courseController.createForm);
router.post("/courses/create", isInstructor, courseController.create);
router.get("/courses/:id", isInstructor, courseController.detail);
router.get("/courses/:id/edit", isInstructor, courseController.editForm);
router.post("/courses/:id/edit", isInstructor, courseController.edit);
router.post("/courses/:id/complete", isInstructor, courseController.markComplete);

// Lecture management
router.get("/courses/:id/lectures", isInstructor, lectureController.lectureList);
router.get("/courses/:id/lectures/create", isInstructor, lectureController.lectureForm);
router.post("/courses/:id/lectures/create", isInstructor, lectureController.createLecture);
router.get("/courses/:id/lectures/:lectureId/edit", isInstructor, lectureController.editLectureForm);
router.post("/courses/:id/lectures/:lectureId/edit", isInstructor, lectureController.updateLecture);

export default router;