import express from "express";
import courseModel from "../models/course.model.js";
import courseController from "../controller/course.controller.js";
const router = express.Router();

// Tìm kiếm khóa học
router.get('/search', async function (req, res) {
    const q = req.query.q || '';
    const keyword = q.replace(/ /g, '&')
    const course = await courseModel.search(keyword)
    console.log(course)
    res.render('vwsearch/search', {
        q: q,
        amount: course.length,
        course_card: course
    })
});

router.post('/search', async function (req, res) {
    console.log(req.body.searchInput)
    const q = req.body.searchInput
    const keyword = q.replace(/ /g, '&')
    const course = await courseModel.search(keyword)
    res.render('vwsearch/search', {
        q: q,
        amount: course.length,
        course_card: course
    })
});

// Xem danh sách watchlist (phải đặt TRƯỚC route /:id)
router.get('/watchlist', courseController.viewWatchlist);

// Chi tiết khóa học (Simple version - tránh conflict)
router.get('/:id', courseController.detail);

// Toggle watchlist
router.post('/:id/watchlist/toggle', courseController.toggleWatchlist);

export default router;