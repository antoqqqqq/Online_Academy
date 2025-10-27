import express from "express";
import courseController from "../controller/course.controller.js";
import courseModel from "../models/course.model.js";
import lectureModel from "../models/lecture.model.js";
import categoryModel from "../models/category.model.js";

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
        const courses = await courseModel.search(keyword);
        
        res.render('vwsearch/search', {
            q: q,
            amount: courses.length,
            course_card_search: courses
        });
    } catch (error) {
        console.error('Search error:', error);
        res.render('vwsearch/search', {
            q: req.query.q || '',
            amount: 0,
            course_card_search: []
        });
    }
});

router.post('/search', async function (req, res) {
    try {
        const q = req.body.searchInput || '';
        const keyword = q.replace(/ /g, '&');
        const courses = await courseModel.search(keyword);
        
        res.render('vwsearch/search', {
            q: q,
            amount: courses.length,
            course_card_search: courses
        });
    } catch (error) {
        console.error('Search error:', error);
        res.render('vwsearch/search', {
            q: req.body.searchInput || '',
            amount: 0,
            course_card_search: []
        });
    }
});

router.get('/', async function (req, res) {
    try {
        const categoryId = 0; // Luôn là 0 để lấy tất cả
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 8; // Hoặc số lượng bạn muốn hiển thị mỗi trang
        const offset = (page - 1) * limit;

        const l1_name = null; // Không có L1 cụ thể
        const l2_name = "Tất cả lĩnh vực"; // Đặt tên L2

        const courses = await courseModel.getCourseWithInstructorName(limit, offset, categoryId);
        const total = await courseModel.countByCategory(categoryId);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const pages = Array.from({ length: totalPages }, (_, i) => ({
            value: i + 1,
            isCurrent: i + 1 === page
        }));

        // Sử dụng template byCat.hbs để hiển thị
        res.render('vwCourse/byCat', {
            layout: 'main',
            title: 'Tất Cả Khóa Học', // Title cho trang
            l1_name: l1_name,
            l2_name: l2_name,
            courses,
            category_id: categoryId, // Truyền categoryId=0
            pagination: {
                currentPage: page,
                totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
                pages
            }
        });
    } catch (err) {
        console.error('Error in GET /courses:', err);
        res.status(500).send('Server error');
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