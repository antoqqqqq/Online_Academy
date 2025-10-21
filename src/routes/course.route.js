import express from "express";
const router = express.Router();
import courseController from "../controller/course.controller.js";
import homeController from "../controller/home.controller.js";
import { isInstructor } from "../middlewares/instructor.mdw.js";

router.get("/", courseController.list);
router.get("/new", isInstructor, courseController.createForm);
router.post("/new", isInstructor, courseController.create);

export default router;