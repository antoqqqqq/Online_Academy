import lectureModel from "../models/lecture.model.js";
import courseModel from "../models/course.model.js";
import videoModel from "../models/video.model.js";
import instructorModel from "../models/instructor.model.js";
import db from "../utils/db.js";

const lectureController = {
    // Lecture management (instructors only)
    lectureList: async (req, res, next) => {
        try {
            const { id } = req.params;
            const course = await courseModel.findById(id);
            if (!course) {
                return res.status(404).render("error", { message: "Course not found.", layout: "main" });
            }
            // Check if the current user is the course instructor
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor || instructor.instructor_id !== course.instructor_id) {
                return res.status(403).render("error", { message: "You can only manage lectures for your own courses.", layout: "main" });
            }
            const lectures = await lectureModel.findByCourse(id);
            const lectureCount = await lectureModel.countByCourse(id);
            res.render("instructor/lecture/list", {
                course,
                lectures,
                lectureCount,
                layout: "main"
            });
        }
        catch (error) {
            next(error);
        }
    },

    lectureForm: async (req, res, next) => {
        try {
            const { id } = req.params;
            const course = await courseModel.findById(id);
            if (!course) {
                return res.status(404).render("error", { message: "Course not found.", layout: "main" });
            }
            // Check if the current user is the course instructor
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor || instructor.instructor_id !== course.instructor_id) {
                return res.status(403).render("error", { message: "You can only manage lectures for your own courses.", layout: "main" });
            }
            res.render("instructor/lecture/create", {
                layout: "main",
                useTinyMCE: true,
                course
            });
        }
        catch (error) {
            next(error);
        }
    },

    createLecture: async (req, res, next) => {
        try {
            const { id } = req.params;
            const course = await courseModel.findById(id);
            if (!course) {
                return res.status(404).render("error", { message: "Course not found.", layout: "main" });
            }
            // Check if the current user is the course instructor
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor || instructor.instructor_id !== course.instructor_id) {
                return res.status(403).render("error", { message: "You can only manage lectures for your own courses.", layout: "main" });
            }
            const {
                title,
                description,
                full_description,
                is_preview,
                video_url,
                time
            } = req.body;
            const lectureData = {
                course_id: id,
                title,
                description,
                full_description: JSON.stringify({
                    content: full_description
                }),
                is_preview: is_preview === "on",
                time: time || 0
            };
            // Create lecture record
            const lecture = await lectureModel.create(lectureData);
            const lectureId = Array.isArray(lecture) ? lecture[0].id : lecture.id;
            // Create video record
            if (video_url) {
                const videoData = {
                    lecture_id: lectureId,
                    url: video_url,
                    time: time || 0
                };
                await videoModel.create(videoData);
            }
            // Update course's total_lectures and total_hours
            const lectureCount = await lectureModel.countByCourse(id);
            const totalTimeResult = await db("lecture").where("course_id", id).sum("time as total_time").first();
            await courseModel.update(id, {
                total_lectures: lectureCount,
                total_hours: (totalTimeResult.total_time || 0) / 60, // Convert minutes to hours
                latest_update: new Date()
            });
            req.session.flash = { type: "success", message: "Lecture created successfully!" };
            res.redirect(`/instructor/courses/${id}/lectures`);
            }
            catch (error) {
                next(error);
            }
        },

    editLectureForm: async (req, res, next) => {
        try {
            const { id, lectureId } = req.params;
            const course = await courseModel.findById(id);
            const lecture = await lectureModel.getWithVideo(lectureId);
            if (!course || !lecture) {
                return res.status(404).render("error", { message: "Course or lecture not found.", layout: "main" });
            }
            // Check if the current user is the course instructor
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor || instructor.instructor_id !== course.instructor_id) {
                return res.status(403).render("error", { message: "You can only manage lectures for your own courses.", layout: "main" });
            }
            res.render("instructor/lecture/edit", {
                layout: "main",
                useTinyMCE: true,
                course,
                lecture
            });
        }
        catch (error) {
            next(error);
        }
    },

    updateLecture: async (req, res, next) => {
        try {
            const { id, lectureId } = req.params;
            const course = await courseModel.findById(id);
            const lecture = await lectureModel.findById(lectureId);
            if (!course || !lecture) {
                return res.status(404).render("error", { message: "Course or lecture not found.", layout: "main"});
            }
            // Check if the current user is the course instructor
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor || instructor.instructor_id !== course.instructor_id) {
                return res.status(403).render("error", { message: "You can only manage lectures for your own courses.", layout: "main" });
            }
            const {
                title,
                description,
                full_description,
                is_preview,
                video_url,
                time
            } = req.body;
            const lectureData = {
                title,
                description,
                full_description: JSON.stringify({
                    content: full_description
                }),
                is_preview: is_preview === "on",
                time: time || 0
            };
            await lectureModel.update(lectureId, lectureData);
            // Update video if URL provided
            if (video_url) {
                const existingVideo = await videoModel.findByLecture(lectureId);
                if (existingVideo.length > 0) {
                    await videoModel.update(existingVideo[0].id, {
                        url: video_url,
                        time: time || 0
                    });
                }
                else {
                    await videoModel.create({
                        lecture_id: lectureId,
                        url: video_url,
                        time: time || 0
                    });
                }
            }
            req.session.flash = { type: "success", message: "Lecture updated successfully!"};
            res.redirect(`/instructor/courses/${id}/lectures`);
        }
        catch (error) {
            next(error);
        }
    }
};

export default lectureController;