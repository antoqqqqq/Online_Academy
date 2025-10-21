import { use } from "react";
import courseModel from "../models/course.model.js";
import instructorModel from "../models/instructor.model.js";
import db from "../utils/db.js";

const courseController = {
    list: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const offset = (page - 1) * limit;
            const courses = await courseModel.findAll({ limit, offset });
            res.render("course", { courses });
        }
        catch (error) {
            next(error);
        }
    },

    // GET form to create a new course (instructors only)
    createForm: async (req, res, next) => {
        try {
            // Get categories for dropdown
            const categories = await courseModel.getCategories();
            res.render("admin/create_course", {
                layout : "main",
                useTinyMCE: true,
                categories
            });
        }
        catch (error) {
            next(error);
        }
    },

    // POST handler to create a course (instructors only)
    create: async (req, res, next) => {
        try {
            const account = req.user;
            if (!account) return res.redirect("/account/signin");
            const instructor = await instructorModel.findByAccountId(account.id);
            if (!instructor) {
                return res.status(403).render("error", { message: "You are not an instructor." });
            }
            const {
                title,
                description,
                full_description,
                image_url,
                level,
                current_price,
                original_price,
                category_id
            } = req.body;
            const newCourse = {
                title,
                description,
                full_description: JSON.stringify({
                    content: full_description
                }),
                image_url: image_url || null,
                instructor_id: instructor.instructor_id,
                rating: 0,
                total_reviews: 0,
                total_hours: 0,
                total_lectures: 0,
                level: level || "Beginner",
                current_price: current_price || 0,
                original_price: original_price || 0,
                is_complete: false,
                category_id: category_id || null,
                total_enrollment: 0,
                is_onsale: false
                };
                const result = await courseModel.create(newCourse);
                const created = Array.isArray(result) ? result[0] : result;
                req.flash("success", "Course created successfully! Add lectures to complete your course.");
                res.redirect(`/courses/${created.course_id}`);
            }
        catch (error) {
            next(error);
        }
    },

    // GET form to edit a course (instructors only)
    editForm: async (req, res, next) => {
        try {
            const { id } = req.params;
            const course = await courseModel.findById(id);
            if (!course) {
                return res.status(404).render("error", { message: "Course not found." });
            }
            // Check if current user is the course instructor
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor || instructor.instructor_id !== course.instructor_id) {
                return res.status(403).render("error", { message: "You can only edit your own courses." });
            }
            const categories = await courseModel.getCategories();
            res.render("admin/edit_course", {
                layout: "main",
                useTinyMCE: true,
                course,
                categories
            });
        }
        catch (error) {
            next(error);
        }
    },

    // POST handler to update a course (instructors only)
    edit: async (req, res, next) => {
        try {
            const { id } = req.params;
            const course = await courseModel.findById(id);
            if (!course) {
                return res.status(404).render("error", { message: "Course not found." });
            }
            // Check if current user is the course instructor
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor || instructor.instructor_id !== course.instructor_id) {
                return res.status(403).render("error", { message: "You can only edit your own courses." });
            }
            const {
                title,
                description,
                full_description,
                image_url,
                level,
                current_price,
                original_price,
                category_id,
                is_complete
            } = req.body;
            const updates = {
                title,
                description,
                full_description: JSON.stringify({
                    content: full_description
                }),
                image_url: image_url || null,
                level,
                current_price: current_price || 0,
                original_price: original_price || 0,
                category_id: category_id || null,
                is_complete: is_complete === "on"
            };
            await courseModel.update(id, updates);
            req.flash("success", "Course updated successfully!");
            res.redirect(`/courses/${id}/edit`);
        }
        catch (error) {
            next(error);
        }
    },

    // Mark course as complete (instructors only)
    markComplete: async (req, res, next) => {
        try {
            const { id } = req.params;
            const course = await courseModel.findById(id);
            if (!course) {
                return res.status(404).render("error", { message: "Course not found." });
            }
            // Check if current user is the course instructor
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor || instructor.instructor_id !== course.instructor_id) {
                return res.status(403).render("error", { message: "You can only mark your own courses as complete." });
            }
            await courseModel.update(id, { is_complete: true });
            req.flash("success", "Course marked as complete!");
            res.redirect(`/courses/${id}/edit`);
        }
        catch (error) {
            next(error);
        }
    },

    // Lecture management (instructors only) can be added here
    lectureList: async (req, res, next) => {
        try {
            const { id } = req.params;
            const course = await courseModel.findById(id);
            if (!course) {
                return res.status(404).render("error", { message: "Course not found." });
            }
            // Check if current user is the course instructor
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor || instructor.instructor_id !== course.instructor_id) {
                return res.status(403).render("error", { message: "You can only manage lectures for your own courses." });
            }
            const lectures = await lectureModel.findByCourse(id);
            res.render("admin/lecture_list", {
                layout: "main",
                course,
                lectures
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
                return res.status(404).render("error", { message: "Course not found." });
            }
            // Check if current user is the course instructor
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor || instructor.instructor_id !== course.instructor_id) {
                return res.status(403).render("error", { message: "You can only manage lectures for your own courses." });
            }
            res.render("admin/lecture_form", {
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
                return res.status(404).render("error", { message: "Course not found." });
            }
            // Check if current user is the course instructor
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor || instructor.instructor_id !== course.instructor_id) {
                return res.status(403).render("error", { message: "You can only manage lectures for your own courses." });
            }
            const {
                title,
                description,
                full_description,
                is_preview,
            } = req.body;
            // Handle video upload
            if (!req.file) {
                return res.status(400).render("error", { message: "Video file is required." });
            }
            const lectureData = {
                course_id: id,
                title,
                description,
                full_description: JSON.stringify({
                    content: full_description
                }),
                is_preview: is_preview === "on",
                time: 0 // Will be updated after video processing
            };
            // Create lecture record
            const lecture = await lectureModel.create(lectureData);
            const lectureId = Array.isArray(lecture) ? lecture[0].id : lecture.id;
            // Create video record using the video file from multer
            const videoData = {
                lecture_id: lectureId,
                url: req.file.path, // This will be updated with Supabase URL
                time: 0 // Will be updated after video processing
            };
            await videoModel.create(videoData);
            // Increment course's total_lectures
            await courseModel.update(id, {
                total_lectures: db.raw('total_lectures + 1')
            });
            req.flash("success", "Lecture created successfully!");
            res.redirect(`/courses/${id}/lectures`);
        }
        catch (error) {
            next(error);
        }
    }
};

export default courseController;