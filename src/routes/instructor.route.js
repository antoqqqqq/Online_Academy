import express from "express";
import instructorController from "../controller/instructor.controller.js";
import { createCourseImageUpload, handleUploadErrors } from "../utils/upload.js";

const router = express.Router();

// Middleware to check if user is instructor
const isInstructor = (req, res, next) => {
    if (req.session.authUser && req.session.authUser.permission === 2) {
        return next();
    }
    res.redirect('/');
};

router.use(isInstructor);

// Instructor dashboard
router.get('/', instructorController.dashboard);

// Course management routes
router.get('/courses/create', instructorController.showCreateCourse);
router.post('/courses/create', instructorController.createCourse);
router.get('/courses/:id/edit', instructorController.showEditCourse);
router.post('/courses/:id/edit', handleUploadErrors, instructorController.updateCourse);

// Lecture management routes
router.post('/courses/:id/lectures', instructorController.addLecture);
router.put('/lectures/:lectureId', instructorController.updateLecture);
router.delete('/lectures/:lectureId', instructorController.deleteLecture);

// Video management routes
router.post('/lectures/:lectureId/videos', instructorController.addVideoToLecture);
router.delete('/videos/:videoId', instructorController.deleteVideo);

// Course completion
router.post('/courses/:id/complete', instructorController.markCourseComplete);

// Profile management
router.get('/profile', instructorController.showProfile);
router.post('/profile/update', express.urlencoded({ extended: true }), instructorController.updateProfile);
router.get('/courses/list', instructorController.getMyCourses);
router.get('/profile/public/:id', instructorController.getPublicProfile);

export default router;