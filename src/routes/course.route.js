import express from "express";
import courseController from "../controller/course.controller.js";
import courseModel from "../models/course.model.js";
import lectureModel from "../models/lecture.model.js";

const router = express.Router();

//Xem chi tiết 
router.get('/details', async function (req, res) {
    const id = req.query.id;
    const course = await courseModel.getCourseById(id);
    // console.log(course);
    if (course === null) {
        return res.redirect('/');
    }
    // Parse nội dung
    if (course.full_description && typeof course.full_description === 'string') {
        try {
            course.full_description = JSON.parse(course.full_description);
        } catch (e) {
            console.error('Invalid full_description JSON', e);
            course.full_description = {};
        }
    }
    const lectures = await lectureModel.getLectureById(id);
    // console.log(lectures);
    const feedback = await courseModel.findFeedback(id);
    const related = await courseModel.findRelated(id);


    res.render('vwCourse/detail', {
        course: course,
        feedback: feedback,
        related: related,
        lectures: lectures,
    });
});

// Tìm kiếm khóa học
router.get('/search', async function (req, res) {
    try {
        const q = req.query.q || '';
        const keyword = q.replace(/ /g, '&');
        const filters ={
                category :0,
                price :0,
                rating : 0
        }
        const courses = await courseModel.search(keyword,filters);
        
        res.render('vwsearch/search', {
            q: q,
            amount: courses.length,
            course_card: courses,
            category:filters.category,
            price: filters.price,
            rating:filters.rating
        });
    } catch (error) {
        console.error('Search error:', error);
        res.render('vwsearch/search', {
            q: req.query.q || '',
            amount: 0,
            course_card: [],
            category: 0,
            price :0,
            rating:0
        });
    }
});

router.post('/search', async function (req, res) {
    try {
        const q = req.body.searchInput || '';

        const filters ={
                category :req.body.category ||0,
                price : req.body.price || 0,
                rating :req.body.rating || 0
        }

        const keyword = q.replace(/ /g, '&');
        const courses = await courseModel.search(keyword,filters);

        res.render('vwsearch/search', {
            q: q,
            amount: courses.length,
            course_card: courses,
            category:filters.category,
            price: filters.price,
            rating:filters.rating
        });
    } catch (error) {
        console.error('Search error:', error);
        res.render('vwsearch/search', {
            q: req.body.searchInput || '',
            amount: 0,
            course_card_search: [],
            category: 0,
            price :0,
            rating:0
        });
    }
});

// Xem danh sách watchlist (phải đặt TRƯỚC route /:id)
router.get('/watchlist', courseController.viewWatchlist);

// Xem bài giảng với media player (phải đặt TRƯỚC route /:id)
router.get('/:courseId/lecture/:lectureId', courseController.viewLecture);

// API routes cho video progress
router.post('/video-progress', courseController.saveVideoProgress);
router.get('/video-progress/:videoId', courseController.getVideoProgress);

// Chi tiết khóa học
router.get('/:id', courseController.detail);

// Toggle watchlist
router.post('/:id/watchlist/toggle', courseController.toggleWatchlist);

export default router;