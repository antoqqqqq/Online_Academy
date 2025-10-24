import express from "express";
import courseModel from "../models/course.model.js";
const router = express.Router();
router.get('/search', async function (req, res) {
    const q = req.query.q || '';
    const keyword = q.replace(/ /g, '&')
    const course = await courseModel.search(keyword)
    console.log(course)
    res.render('vwsearch/search', {
        q: q,
        amount: course.length,
        course_card_search: course
    })
})
router.post('/search', async function (req, res) {
    console.log(req.body.searchInput)
    const q = req.body.searchInput
    const keyword = q.replace(/ /g, '&')
    const course = await courseModel.search(keyword)
    res.render('vwsearch/search', {
        q: q,
        amount: course.length,
        course_card_search: course
    })
})
export default router;