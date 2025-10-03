import express from "express";
const router = express.Router();
import homeController from "../controller/home.controller.js";
router.get("/", homeController.index);

export default router;