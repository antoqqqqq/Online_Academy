import express from "express";
import instructorController from "../controller/instructor.controller.js";
import { upload, handleUploadErrors } from "../utils/upload.js";

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

// Course management routes with upload error handling
router.get('/courses/create', instructorController.showCreateCourse);
router.post('/courses/create', upload.single('image'), handleUploadErrors, instructorController.createCourse);
router.get('/courses/:id/edit', instructorController.showEditCourse);
router.post('/courses/:id/edit', upload.single('image'), handleUploadErrors, instructorController.updateCourse);

// Lecture management routes
router.post('/courses/:id/lectures', instructorController.addLecture);
router.put('/lectures/:lectureId', instructorController.updateLecture);
router.delete('/lectures/:lectureId', instructorController.deleteLecture);

// Profile management
router.post('/profile', instructorController.updateProfile);

export default router;