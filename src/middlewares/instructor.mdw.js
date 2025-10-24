export function isInstructor(req, res, next) {
    if (req.user && req.user.permission === 2) { // permission 2 indicates instructor
        return next();
    }
    if (!req.user) {
        return res.redirect("/account/signin?returnUrl=" + encodeURIComponent(req.originalUrl));
    }
    return res.status(403).render("error", { message: "Access denied. Instructor only.", layout: "main" });
}