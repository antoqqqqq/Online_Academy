import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'src/public/uploads/courses');

const ensureUploadDir = () => {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Created upload directory:', uploadDir);
    }
};

ensureUploadDir();

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        ensureUploadDir();
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, 'image-' + uniqueSuffix + fileExtension);
    }
});

// File filter with better error messages
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        // Create a custom error with user-friendly message
        const error = new Error('Only image files (JPG, PNG, GIF, etc.) are allowed!');
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Custom middleware to handle Multer errors
const handleUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            req.uploadError = 'File too large. Maximum size is 5MB.';
            return next();
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            req.uploadError = 'Unexpected file field.';
            return next();
        }
    } else if (err.code === 'INVALID_FILE_TYPE') {
        req.uploadError = 'Only image files (JPG, PNG, GIF, etc.) are allowed!';
        return next();
    }
    
    // For other errors, pass to the next error handler
    next(err);
};

export { upload, handleUploadErrors };