import express from "express";
import courseModel from "../models/course.model.js";
import lectureModel from "../models/lecture.model.js";
const router = express.Router();

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


    res.render('vwCourse/details', {
        course: course,
        feedback: feedback,
        related: related,
        lectures: lectures,
    });
});



export default router;