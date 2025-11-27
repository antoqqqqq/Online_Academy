import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base static directory
const staticBaseDir = path.join(process.cwd(), 'src/static');

// Ensure static directories exist
const ensureStaticDirs = (courseId = null, lectureId = null, instructorId = null) => {
    // Ensure base static directory exists
    if (!fs.existsSync(staticBaseDir)) {
        fs.mkdirSync(staticBaseDir, { recursive: true });
    }

    // Ensure default directory exists
    const defaultDir = path.join(staticBaseDir, 'default');
    if (!fs.existsSync(defaultDir)) {
        fs.mkdirSync(defaultDir, { recursive: true });
    }

    // Ensure course directory exists if courseId provided
    if (courseId) {
        const courseDir = path.join(staticBaseDir, courseId.toString());
        if (!fs.existsSync(courseDir)) {
            fs.mkdirSync(courseDir, { recursive: true });
        }

        // Ensure lecture directory exists if lectureId provided
        if (lectureId) {
            const lectureDir = path.join(courseDir, lectureId.toString());
            if (!fs.existsSync(lectureDir)) {
                fs.mkdirSync(lectureDir, { recursive: true });
            }
        }
    }

    // Ensure instructor directory exists if instructorId provided
    if (instructorId) {
        const instructorDir = path.join(staticBaseDir, instructorId.toString());
        if (!fs.existsSync(instructorDir)) {
            fs.mkdirSync(instructorDir, { recursive: true });
        }
    }
};

// Dynamic storage configuration for course images
const courseImageStorage = (courseId) => multer.diskStorage({
    destination: function (req, file, cb) {
        ensureStaticDirs(courseId);
        const uploadDir = path.join(staticBaseDir, courseId.toString());
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, 'course-image-' + uniqueSuffix + fileExtension);
    }
});

// Dynamic storage configuration for instructor profile pictures
const instructorStorage = (instructorId) => multer.diskStorage({
    destination: function (req, file, cb) {
        ensureStaticDirs(null, null, instructorId);
        const uploadDir = path.join(staticBaseDir, instructorId.toString());
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, 'profile-' + uniqueSuffix + fileExtension);
    }
});

// Dynamic storage configuration for lecture videos
const videoStorage = (courseId, lectureId) => multer.diskStorage({
    destination: function (req, file, cb) {
        ensureStaticDirs(courseId, lectureId);
        const uploadDir = path.join(staticBaseDir, courseId.toString(), lectureId.toString());
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, 'video-' + uniqueSuffix + fileExtension);
    }
});

// File filters
const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        const error = new Error('Only image files (JPG, PNG, GIF, etc.) are allowed!');
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
};

const videoFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        const error = new Error('Only video files (MP4, AVI, MOV, etc.) are allowed!');
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
};

// Factory functions for creating multer instances with dynamic paths
export const createCourseImageUpload = (courseId) => multer({
    storage: courseImageStorage(courseId),
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});


export const createVideoUpload = (courseId, lectureId) => multer({
    storage: videoStorage(courseId, lectureId),
    fileFilter: videoFilter,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB
    }
});

// Error handling middleware
export const handleUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            if (err.field === 'video') {
                req.uploadError = 'Video file too large. Maximum size is 500MB.';
            } else if (err.field === 'profile_picture') {
                req.uploadError = 'Profile picture too large. Maximum size is 2MB.';
            } else {
                req.uploadError = 'File too large. Maximum size is 5MB.';
            }
            return next();
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            req.uploadError = 'Unexpected file field.';
            return next();
        }
    } else if (err.code === 'INVALID_FILE_TYPE') {
        if (err.message.includes('video')) {
            req.uploadError = 'Only video files (MP4, AVI, MOV, etc.) are allowed!';
        } else {
            req.uploadError = 'Only image files (JPG, PNG, GIF, etc.) are allowed!';
        }
        return next();
    }
    
    next(err);
};

// Helper function to get file URLs
export const getFileUrl = (type, id, subId = null, filename = null) => {
    if (!filename) {
        // Return default image if no filename provided
        if (type === 'course') {
            return '/static/default/default-course.jpg';
        } else if (type === 'instructor') {
            return '/static/default/default-avatar.jpg';
        }
        return null;
    }

    // Handle temporary uploads (when course ID is 'temp')
    if (id === 'temp') {
        return `/static/temp/${filename}`;
    }

    if (type === 'course') {
        return `/static/${id}/${filename}`;
    } else if (type === 'lecture') {
        return `/static/${id}/${subId}/${filename}`;
    } else if (type === 'instructor') {
        return `/static/${id}/${filename}`;
    }
    
    return null;
};

// For backward compatibility
export const uploadImage = createCourseImageUpload('temp');
export const uploadVideo = createVideoUpload('temp', 'temp');