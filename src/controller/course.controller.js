import courseModel from "../models/course.model.js";
import instructorModel from "../models/instructor.model.js";

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
            res.render("admin/create_course", { layout: "main" });
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
                const {
                    title,
                    description,
                    image_url,
                    level,
                    current_price,
                    original_price,
                    category_id
                } = req.body;
                const newCourse = {
                    title,
                    description,
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
                    category_id :category_id || null,
                    total_enrollment: 0,
                    is_onsale: false
                };
                const result = await courseModel.create(newCourse);
                const created = Array.isArray(result) ? result[0] : result;
                res.redirect(`/courses/${created.course_id}`);
            }
        }
        catch (error) {
                next(error);
        }
    }
};

export default courseController;