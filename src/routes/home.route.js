import express from "express";
const router = express.Router();
import categoryModel from "../models/category.model.js";
import homeController from "../controller/home.controller.js";
router.get("/", async (req, res) => {
    try {
        const categories = await categoryModel.index(req, res);
        res.locals.categories = categories;
        const data = await homeController.index(req, res);
        res.render("home",  data );
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).render('error');
    }});
export default router;