import express from 'express';
import adminController from '../controller/admin.controller.js';

const router = express.Router();

// Middleware to check for admin privileges
const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.permission === 'admin') {
        return next();
    }
    res.redirect('/'); // Or redirect to a login page
};

// Use the isAdmin middleware for all routes in this file
router.use(isAdmin);

// Admin Dashboard
router.get('/', adminController.dashboard);


export default router;
