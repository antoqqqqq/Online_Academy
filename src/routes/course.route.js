import express from "express";
const router = express.Router();
import courseController from "../controller/course.controller.js";
import homeController from "../controller/home.controller.js";
router.get("/", courseController.list);

export default router;