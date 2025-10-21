export function isInstructor(req, res, next) {
    if (req.user && req.user.permission === 2) { // permission 2 indicates instructor
        return next();
    }
    return res.status(403).render("error", { message: "Access denied. Instructor only." });
}