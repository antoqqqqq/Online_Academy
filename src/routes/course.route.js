import express from "express";
const router = express.Router();
import courseController from "../controller/course.controller.js";
import homeController from "../controller/home.controller.js";
import { isInstructor } from "../middlewares/instructor.mdw.js";

router.get("/", courseController.list);
router.get("/new", isInstructor, courseController.createForm);
router.post("/new", isInstructor, courseController.create);

// Course management routes
router.get("/:id/edit" , isInstructor, courseController.editForm);
router.post("/:id/edit" , isInstructor, courseController.edit);
router.get("/:id/lectures" , isInstructor, courseController.lectureList);
router.get("/:id/lectures/new" , isInstructor, courseController.lectureForm);
router.post("/:id/lectures", isInstructor, courseController.createLecture);
router.post("/:id/complete", isInstructor, courseController.markComplete);
export default router;