import instructorModel from "../models/instructor.model.js";
import accountModel from "../models/accout.model.js";
import courseModel from "../models/course.model.js";
import bcrypt from "bcrypt";

const instructorController = {
    // Instructor dashboard
    dashboard: async (req, res, next) => {
        try {
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor) {
                return res.status(403).render("error", { message: "You are not an instructor.", layout: "main" });
            }
            const courses = await instructorModel.getCourses(instructor.instructor_id);
            const stats = await instructorModel.getStats(instructor.instructor_id);
            res.render("instructor/dashboard", {
                instructor,
                courses,
                stats,
                layout: "main"
            });
        }
        catch (error) {
            next(error);
        }
    },

    // Profile management
    profile: async (req, res, next) => {
        try {
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor) {
                return res.status(403).render("error", { message: "You are not an instructor.", layout: "main" });
            }
            res.render("instructor/profile", {
                layout: "main",
                instructor
            });
        }
        catch (error) {
            next(error);
        }
    },

    // Update profile
    updateProfile: async (req, res, next) => {
        try {
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor) {
                return res.status(403).render("error", { message: "You are not an instructor.", layout: "main" });
            }
            const { name, email, bio } = req.body;
            // Update account information
            await accountModel.update(instructor.account_id, { name, email });
            // Update instructor bio
            await instructorModel.update(instructor.instructor_id, { bio });
            req.session.flash = { type: "success", message: "Profile updated successfully!" };
            res.redirect("/instructor/profile");
        }
        catch (error) {
            next(error);
        }
    },

    // Change password
    changePasswordForm: async (req, res, next) => {
        try {
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor) {
                return res.status(403).render("error", { message: "You are not an instructor.", layout: "main" });
            }
            res.render("instructor/change-password", {
                layout: "main",
                instructor
            });
        }
        catch (error) {
            next(error);
        }
    },

    changePassword: async (req, res, next) => {
        try {
            const instructor = await instructorModel.findByAccountId(req.user.id);
            if (!instructor) {
                return res.status(403).render("error", { message: "You are not an instructor.", layout: "main" });
            }
            const { current_password, new_password, confirm_password } = req.body;
            // Verify current password
            const isMatch = await bcrypt.compare(current_password, instructor.password);
            if (!isMatch) {
                return res.render("instructor/change-password", {
                    layout: "main",
                    instructor,
                    error: "Current password is incorrect."
                });
            }
            // Check if new password match
            if (new_password !== confirm_password) {
                return res.render("instructor/change-password", {
                    layout: "main",
                    instructor,
                    error: "New password do not match."
                });
            }
            // Hash new password
            const hashedPassword = await bcrypt.hash(new_password, 10);
            // Update password
            await accountModel.updatePassword(instructor.account_id, hashedPassword);
            req.session.flash = { type: "success", message: "Password changed successfully!" };
            res.redirect("/instructor/profile");
        }
        catch (error) {
            next(error);
        }
    },

    // Become instructor (for regular users)
    becomeInstructorForm: async (req, res, next) => {
        try {
            if (!req.user) {
                return res.redirect("/account/signin");
            }
            const existingInstructor = await instructorModel.findByAccountId(req.user.id);
            if (existingInstructor) {
                return res.redirect("/instructor/dashboard");
            }
            res.render("instructor/become-instructor", {
                layout: "main"
            });
        }
        catch (error) {
            next(error);
        }
    },

    becomeInstructor: async (req, res, next) => {
        try {
            if (!req.user) {
                return res.redirect("/account/signin");
            }
            const existingInstructor = await instructorModel.findByAccountId(req.user.id);
            if (existingInstructor) {
                return res.redirect("/instructor/dashboard");
            }
            const { bio } = req.body;
            const instructorData = {
                account_id: req.user.id,
                name: req.user.name,
                bio: bio || "No bio provided.",
                total_students: 0
            };
            await instructorModel.create(instructorData);
            // Update account permission to instructor (2)
            await accountModel.update(req.user.id, { permission: 2 });
            req.session.flash = { type: "success", message: "Congratulations! You are now an instructor."};
            res.redirect("/instructor/dashboard");
        }
        catch (error) {
            next(error);
        }
    }
};

export default instructorController;