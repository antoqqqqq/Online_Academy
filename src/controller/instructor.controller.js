import courseModel from '../models/course.model.js';
import instructorModel from '../models/instructor.model.js';
import categoryModel from '../models/category.model.js';
import { createCourseImageUpload, createVideoUpload, getFileUrl, handleUploadErrors } from "../utils/upload.js";
import db from '../utils/db.js';
import path from 'path';
import fs from 'fs';

const staticBaseDir = path.join(process.cwd(), 'src/static');

const instructorController = {
    // Dashboard for instructor
    dashboard: async (req, res) => {
        try {
            const accountId = req.session.authUser.id;
            console.log('Loading instructor dashboard for account:', accountId);
            
            // Validate account has instructor permission
            if (req.session.authUser.permission !== 2) {
                console.log('User does not have instructor permission');
                return res.redirect('/?error=access_denied');
            }

            // Use the safe method to get or create instructor
            const instructor = await instructorModel.getOrCreateInstructor(
                accountId, 
                req.session.authUser.name
            );

            if (!instructor) {
                console.error('No instructor object returned');
                return res.status(500).render('error', {
                    message: 'Instructor profile not available'
                });
            }

            console.log('Instructor profile loaded:', instructor.instructor_id);

            // Get instructor's courses
            const courses = await instructorModel.getCoursesByInstructor(instructor.instructor_id);
            console.log(`Loaded ${courses.length} courses for instructor`);

            res.render('vwInstructor/dashboard', {
                layout: 'main',
                instructor: instructor,
                courses: courses
            });

        } catch (error) {
            console.error('Error in instructor dashboard:', error);
            res.status(500).render('error', {
                message: 'Unable to load instructor dashboard',
                error: process.env.NODE_ENV === 'development' ? error : {}
            });
        }
    },

    // Show course creation form
    showCreateCourse: async (req, res) => {
        try {
            const categories = await categoryModel.getAllForFilter();
            
            res.render('vwInstructor/createCourse', {
                layout: 'main',
                categories: categories,
                errors: null
            });
        } catch (error) {
            console.error('Error loading create course form:', error);
            res.redirect('/instructor');
        }
    },

    // Create new course
    createCourse: async (req, res) => {
        try {
            // First, process the file upload with a temporary ID
            const tempUpload = createCourseImageUpload('temp');
            
            // Process the upload
            await new Promise((resolve, reject) => {
                tempUpload.single('image')(req, res, (err) => {
                    if (err) {
                        console.error('File upload error:', err);
                        req.uploadError = err.message;
                    }
                    resolve();
                });
            });

            const createFullDescriptionJSON = (text) => {
                if (!text || text.trim() === '') {
                    return null;
                }
                
                return JSON.stringify({
                    content: text.trim(),
                    sections: [],
                    created_at: new Date().toISOString()
                });
            };

            const {
                title,
                description,
                category_id,
                level,
                original_price,
                current_price,
                full_description
            } = req.body;

            console.log('Received form data:', {
                title, category_id, level, original_price, current_price
            });

            // Validation
            const errors = [];
            if (!title || title.trim().length === 0) {
                errors.push('Course title is required');
            }
            if (!description || description.trim().length === 0) {
                errors.push('Short description is required');
            }
            if (!category_id) {
                errors.push('Category is required');
            }
            if (!level) {
                errors.push('Level is required');
            }
            if (!original_price || isNaN(original_price)) {
                errors.push('Valid original price is required');
            }

            // Check if there's an upload error from Multer
            if (req.uploadError) {
                errors.push(req.uploadError);
            }

            if (errors.length > 0) {
                const categories = await categoryModel.getAllForFilter();
                return res.render('vwInstructor/createCourse', {
                    layout: 'main',
                    categories: categories,
                    errors: errors,
                    formData: req.body
                });
            }

            // Get instructor ID
            const accountId = req.session.authUser.id;
            const instructor = await instructorModel.findByAccountId(accountId);
            
            if (!instructor) {
                console.error('No instructor found for account:', accountId);
                return res.redirect('/instructor');
            }

            console.log('Creating course for instructor:', instructor.instructor_id);

            // Get the next available course_id
            const maxCourseResult = await db('courses')
                .max('course_id as max_id')
                .first();
            
            const nextCourseId = (maxCourseResult.max_id || 0) + 1;
            console.log('Next available course_id:', nextCourseId);

            // Parse prices safely
            const originalPrice = parseFloat(original_price);
            const currentPrice = current_price && current_price !== '' ? parseFloat(current_price) : originalPrice;
            const isOnSale = currentPrice < originalPrice;

            console.log('Price calculation:', {
                originalPrice,
                currentPrice,
                isOnSale
            });

            // Prepare course data
            const courseData = {
                course_id: nextCourseId,
                title: title.trim(),
                description: description.trim(),
                category_id: parseInt(category_id),
                instructor_id: instructor.instructor_id,
                level: level,
                original_price: originalPrice,
                current_price: currentPrice,
                is_complete: false,
                is_onsale: isOnSale,
                rating: 0,
                total_reviews: 0,
                total_hours: 0,
                total_lectures: 0,
                total_enrollment: 0,
                full_description: createFullDescriptionJSON(full_description),
                latest_update: new Date()
            };

            // Handle image upload - file was already processed above
            if (req.file) {
                console.log('Uploaded file details:', {
                    filename: req.file.filename,
                    originalname: req.file.originalname,
                    path: req.file.path
                });

                // If file was uploaded to temp directory, move it to the correct course directory
                if (req.file.destination.includes('temp')) {
                    const tempPath = req.file.path;
                    const newDir = path.join(staticBaseDir, nextCourseId.toString());
                    const newPath = path.join(newDir, req.file.filename);
                    
                    // Ensure new directory exists
                    if (!fs.existsSync(newDir)) {
                        fs.mkdirSync(newDir, { recursive: true });
                    }
                    
                    // Move the file
                    fs.renameSync(tempPath, newPath);
                    console.log('Moved file from temp to:', newPath);
                }

                courseData.image_url = getFileUrl('course', nextCourseId, null, req.file.filename);
                console.log('Course image uploaded to:', courseData.image_url);

            } else {
                // Use default course image
                courseData.image_url = '/static/default/default-course.jpg';
                console.log('Using default course image');
            }

            console.log('Final course data for insertion:', courseData);

            // Insert course
            const [newCourse] = await db('courses')
                .insert(courseData)
                .returning('*');

            console.log('Course created successfully. Course ID:', newCourse.course_id);

            res.redirect(`/instructor/courses/${newCourse.course_id}/edit`);
        } catch (error) {
            console.error('Error creating course:', error);
            const categories = await categoryModel.getAllForFilter();
            res.render('vwInstructor/createCourse', {
                layout: 'main',
                categories: categories,
                errors: ['An error occurred while creating the course: ' + error.message],
                formData: req.body
            });
        }
    },

    // Show course edit form
    showEditCourse: async (req, res) => {
        try {
            const courseId = req.params.id;
            const accountId = req.session.authUser.id;
            const instructor = await instructorModel.findByAccountId(accountId);

            // Verify course belongs to instructor
            const course = await db('courses')
                .where({
                    course_id: courseId,
                    instructor_id: instructor.instructor_id
                })
                .first();

            if (!course) {
                return res.redirect('/instructor');
            }

            let displayFullDescription = '';
            if (course.full_description) {
                if (typeof course.full_description === 'string') {
                    try {
                        const parsed = JSON.parse(course.full_description);
                        displayFullDescription = parsed.content || course.full_description;
                    } catch (error) {
                        displayFullDescription = course.full_description;
                    }
                } else if (typeof course.full_description === 'object') {
                    displayFullDescription = course.full_description.content || JSON.stringify(course.full_description);
                }
            }

            const categories = await categoryModel.getAllForFilter();
            
            // Get lectures with their videos
            const lectures = await db('lecture')
                .where('course_id', courseId)
                .orderBy('id', 'asc');

            // Get videos for each lecture and ensure proper data types
            const lecturesWithVideos = await Promise.all(
                lectures.map(async (lecture) => {
                    const videos = await db('video')
                        .where('lecture_id', lecture.id)
                        .orderBy('id', 'asc');
                    
                    // Ensure boolean values are properly handled
                    return {
                        ...lecture,
                        is_preview: Boolean(lecture.is_preview), // Force boolean type
                        videos: videos,
                        time: lecture.time || 0
                    };
                })
            );

            // DEBUG: Log lecture data
            console.log('🔍 LECTURE DATA FOR COURSE:', courseId);
            lecturesWithVideos.forEach((lecture, index) => {
                console.log(`Lecture ${index + 1}:`, {
                    id: lecture.id,
                    title: lecture.title,
                    is_preview: lecture.is_preview,
                    time: lecture.time
                });
            });

            // Calculate course completion status
            const totalLectures = lectures.length;
            const lecturesWithContent = lecturesWithVideos.filter(lecture => 
                lecture.videos && lecture.videos.length > 0
            ).length;
            const completionPercentage = totalLectures > 0 ? 
                Math.round((lecturesWithContent / totalLectures) * 100) : 0;

            res.render('vwInstructor/editCourse', {
                layout: 'main',
                course: {
                    ...course,
                    full_description: displayFullDescription,
                    category_id: parseInt(course.category_id) || '',
                    level: course.level || ''
                },
                categories: categories,
                lectures: lecturesWithVideos,
                completionPercentage: completionPercentage,
                errors: null
            });
        } catch (error) {
            console.error('Error loading edit course form:', error);
            res.redirect('/instructor');
        }
    },

    // Update course information
    updateCourse: async (req, res) => {
        try {
            const createFullDescriptionJSON = (content) => {
                if (!content || content.trim() === '') {
                    return null;
                }
                
                return JSON.stringify({
                    content: content.trim(),
                    sections: [],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            };

            const courseId = req.params.id;
            const accountId = req.session.authUser.id;
            const instructor = await instructorModel.findByAccountId(accountId);

            // Create dynamic upload middleware for this specific course
            const courseImageUpload = createCourseImageUpload(courseId);

            // Handle image upload with the dynamic middleware
            await new Promise((resolve, reject) => {
                courseImageUpload.single('image')(req, res, (err) => {
                    if (err) {
                        console.error('Image upload error:', err);
                        req.uploadError = err.message;
                    }
                    resolve();
                });
            });

            // Verify course belongs to instructor
            const existingCourse = await db('courses')
                .where({
                    course_id: courseId,
                    instructor_id: instructor.instructor_id
                })
                .first();

            if (!existingCourse) {
                return res.redirect('/instructor');
            }

            const {
                title,
                description,
                category_id,
                level,
                original_price,
                current_price,
                full_description,
                is_complete
            } = req.body;

            console.log('Updating course:', courseId, 'Completion requested:', is_complete);

            // Validation
            const errors = [];
            if (!title || title.trim().length === 0) {
                errors.push('Course title is required');
            }

            // Check if there's an upload error from Multer
            if (req.uploadError) {
                errors.push(req.uploadError);
            }

            // Validate completion status
            if (is_complete === 'true') {
                const canComplete = await this.canMarkCourseComplete(courseId);
                if (!canComplete.canComplete) {
                    errors.push(`Cannot mark course as complete: ${canComplete.reason}`);
                }
            }

            if (errors.length > 0) {
                const categories = await categoryModel.getAllForFilter();
                const lectures = await db('lecture')
                    .where('course_id', courseId)
                    .orderBy('id', 'asc');
                    
                return res.render('vwInstructor/editCourse', {
                    layout: 'main',
                    course: { 
                        ...existingCourse, 
                        ...req.body,
                        full_description: full_description 
                    },
                    categories: categories,
                    lectures: lectures,
                    errors: errors
                });
            }

            // Parse prices safely
            const originalPrice = parseFloat(original_price);
            const currentPrice = current_price && current_price !== '' ? parseFloat(current_price) : originalPrice;
            const isOnSale = currentPrice < originalPrice;

            // Only allow completion if validation passes
            const finalIsComplete = is_complete === 'true';

            // Prepare update data
            const updateData = {
                title: title.trim(),
                description: description.trim(),
                category_id: parseInt(category_id),
                level: level,
                original_price: originalPrice,
                current_price: currentPrice,
                is_complete: finalIsComplete,
                is_onsale: isOnSale,
                full_description: createFullDescriptionJSON(full_description),
                latest_update: new Date()
            };

            // Handle image upload
            if (req.file) {
                updateData.image_url = getFileUrl('course', courseId, null, req.file.filename);
            }

            await db('courses')
                .where('course_id', courseId)
                .update(updateData);

            console.log('Course updated successfully. Completion status:', finalIsComplete);

            res.redirect(`/instructor/courses/${courseId}/edit?success=1`);
        } catch (error) {
            console.error('Error updating course:', error);
            const categories = await categoryModel.getAllForFilter();
            const lectures = await db('lecture')
                .where('course_id', req.params.id)
                .orderBy('id', 'asc');
                
            res.render('vwInstructor/editCourse', {
                layout: 'main',
                course: { 
                    ...req.body, 
                    course_id: req.params.id,
                    full_description: req.body.full_description 
                },
                categories: categories,
                lectures: lectures,
                errors: ['An error occurred while updating the course: ' + error.message]
            });
        }
    },

    // Add lecture to course
    addLecture: async (req, res) => {
        try {
            const courseId = req.params.id;
            const accountId = req.session.authUser.id;
            const instructor = await instructorModel.findByAccountId(accountId);

            // Verify course belongs to instructor
            const course = await db('courses')
                .where({
                    course_id: courseId,
                    instructor_id: instructor.instructor_id
                })
                .first();

            if (!course) {
                return res.json({ success: false, message: 'Course not found' });
            }

            const { title, description, is_preview, time } = req.body;

            const lectureData = {
                course_id: courseId,
                title: title.trim(),
                description: description || '',
                is_preview: is_preview === 'true',
                time: time ? parseFloat(time) : 0,
                created_at: new Date()
            };

            console.log('📚 Inserting lecture for course:', courseId);

            const [newLecture] = await db('lecture')
                .insert(lectureData)
                .returning('*');

            console.log('✅ Lecture created with ID:', newLecture.id);

            // RESET COURSE COMPLETION STATUS when new lecture is added
            await db('courses')
                .where('course_id', courseId)
                .update({
                    is_complete: false, // Always reset when new content added
                    latest_update: new Date()
                });

            // Update course lecture count
            const lectureCount = await db('lecture')
                .where('course_id', courseId)
                .count('id as count')
                .first();

            await db('courses')
                .where('course_id', courseId)
                .update({
                    total_lectures: parseInt(lectureCount.count),
                    latest_update: new Date()
                });

            res.json({ 
                success: true, 
                message: 'Lecture added successfully',
                lecture: newLecture
            });
        } catch (error) {
            console.error('Error adding lecture:', error);
            
            if (error.code === '23505') {
                // Lecture sequence issue
                try {
                    const maxResult = await db('lecture')
                        .max('id as max_id')
                        .first();
                    
                    const nextId = (maxResult.max_id || 0) + 1;
                    await db.raw("SELECT setval('chapter_id_seq', ?, false)", [nextId]);
                    
                    return res.json({ 
                        success: false, 
                        message: 'Please try adding the lecture again.' 
                    });
                } catch (seqError) {
                    console.error('Sequence reset failed:', seqError);
                }
            }
            
            res.json({ 
                success: false, 
                message: 'Failed to add lecture: ' + error.message 
            });
        }
    },

    // Add video to lecture
    addVideoToLecture: async (req, res) => {
        try {
            const { lectureId } = req.params;
            const accountId = req.session.authUser.id;
            const instructor = await instructorModel.findByAccountId(accountId);

            // Verify lecture belongs to instructor's course
            const lecture = await db('lecture')
                .join('courses', 'lecture.course_id', 'courses.course_id')
                .where({
                    'lecture.id': lectureId,
                    'courses.instructor_id': instructor.instructor_id
                })
                .first();

            if (!lecture) {
                return res.json({ success: false, message: 'Lecture not found or access denied' });
            }

            // Create dynamic upload middleware for this specific course and lecture
            const videoUpload = createVideoUpload(lecture.course_id.toString(), lectureId.toString());

            // Process the video upload first
            await new Promise((resolve, reject) => {
                videoUpload.single('video')(req, res, (err) => {
                    if (err) {
                        console.error('Video upload error:', err);
                        req.uploadError = err.message;
                    }
                    resolve();
                });
            });

            const { video_title, description, duration } = req.body;

            // Check for upload errors
            if (req.uploadError) {
                return res.json({ success: false, message: req.uploadError });
            }

            if (!req.file) {
                return res.json({ success: false, message: 'Video file is required' });
            }

            const videoData = {
                lecture_id: lectureId,
                video_title: video_title ? video_title.trim() : 'Untitled Video',
                video_url: getFileUrl('lecture', lecture.course_id, lectureId, req.file.filename),
                time: duration ? parseInt(duration) : 0,
                created_at: new Date()
            };

            console.log('🎥 Inserting video for lecture:', lectureId);

            let newVideo;
            
            try {
                // First attempt: Normal insert
                [newVideo] = await db('video')
                    .insert(videoData)
                    .returning('*');
                
                console.log('✅ Video inserted successfully with ID:', newVideo.id);
                
            } catch (insertError) {
                console.error('❌ Insert failed:', insertError.message);
                
                if (insertError.code === '23505') {
                    // Duplicate key
                    console.log('🔄 Fixing video_id_seq and retrying...');
                    
                    const maxResult = await db('video')
                        .max('id as max_id')
                        .first();
                    
                    const nextId = (maxResult.max_id || 0) + 1;
                    await db.raw("SELECT setval('video_id_seq', ?, false)", [nextId]);
                    
                    [newVideo] = await db('video')
                        .insert(videoData)
                        .returning('*');
                    
                    console.log('✅ Video inserted after sequence fix with ID:', newVideo.id);
                } else {
                    throw insertError;
                }
            }

            // Update course update time
            await db('courses')
                .where('course_id', lecture.course_id)
                .update({
                    latest_update: new Date()
                });

            res.json({ 
                success: true, 
                message: 'Video added successfully!',
                videoId: newVideo.id
            });

        } catch (error) {
            console.error('❌ Final error adding video:', error);
            
            let userMessage = 'Failed to add video. Please try again.';
            if (error.code === '23505') {
                userMessage = 'System error. The video sequence needs repair.';
            }
            
            res.json({ 
                success: false, 
                message: userMessage 
            });
        }
    },

    // Update lecture
    updateLecture: async (req, res) => {
        try {
            const { lectureId } = req.params;
            const accountId = req.session.authUser.id;
            const instructor = await instructorModel.findByAccountId(accountId);

            // Verify lecture belongs to instructor's course
            const lecture = await db('lecture')
                .join('courses', 'lecture.course_id', 'courses.course_id')
                .where({
                    'lecture.id': lectureId,
                    'courses.instructor_id': instructor.instructor_id
                })
                .first();

            if (!lecture) {
                return res.json({ success: false, message: 'Lecture not found' });
            }

            const { title, description, is_preview, time } = req.body;

            await db('lecture')
                .where('id', lectureId)
                .update({
                    title: title.trim(),
                    description: description || '',
                    is_preview: is_preview === 'true',
                    time: time ? parseFloat(time) : 0
                });

            // Update course update time
            await db('courses')
                .where('course_id', lecture.course_id)
                .update({
                    latest_update: new Date()
                });

            res.json({ success: true, message: 'Lecture updated successfully' });
        } catch (error) {
            console.error('Error updating lecture:', error);
            res.json({ success: false, message: 'Failed to update lecture' });
        }
    },

    // Delete lecture
    deleteLecture: async (req, res) => {
        try {
            const { lectureId } = req.params;
            const accountId = req.session.authUser.id;
            const instructor = await instructorModel.findByAccountId(accountId);

            // Verify lecture belongs to instructor's course
            const lecture = await db('lecture')
                .join('courses', 'lecture.course_id', 'courses.course_id')
                .where({
                    'lecture.id': lectureId,
                    'courses.instructor_id': instructor.instructor_id
                })
                .first();

            if (!lecture) {
                return res.json({ success: false, message: 'Lecture not found' });
            }

            // Delete associated videos first
            await db('video')
                .where('lecture_id', lectureId)
                .del();

            // Delete lecture
            await db('lecture')
                .where('id', lectureId)
                .del();

            // Update course lecture count
            const lectureCount = await db('lecture')
                .where('course_id', lecture.course_id)
                .count('id as count')
                .first();

            await db('courses')
                .where('course_id', lecture.course_id)
                .update({
                    total_lectures: parseInt(lectureCount.count),
                    latest_update: new Date(),
                    is_complete: false // Reset completion status 
                });

            res.json({ success: true, message: 'Lecture deleted successfully' });
        } catch (error) {
            console.error('Error deleting lecture:', error);
            res.json({ success: false, message: 'Failed to delete lecture' });
        }
    },

    // Delete video
    deleteVideo: async (req, res) => {
        try {
            const { videoId } = req.params;
            const accountId = req.session.authUser.id;
            const instructor = await instructorModel.findByAccountId(accountId);

            // Verify video belongs to instructor's course
            const video = await db('video')
                .join('lecture', 'video.lecture_id', 'lecture.id')
                .join('courses', 'lecture.course_id', 'courses.course_id')
                .where({
                    'video.id': videoId,
                    'courses.instructor_id': instructor.instructor_id
                })
                .first();

            if (!video) {
                return res.json({ success: false, message: 'Video not found or access denied' });
            }

            // Delete video progress records
            await db('video_process')
                .where('video_id', videoId)
                .del();

            // Delete video
            await db('video')
                .where('id', videoId)
                .del();

            // Update course update time and reset completion status
            await db('courses')
                .where('course_id', video.course_id)
                .update({
                    latest_update: new Date(),
                    is_complete: false
                });

            res.json({ success: true, message: 'Video deleted successfully' });
        } catch (error) {
            console.error('Error deleting video:', error);
            res.json({ success: false, message: 'Failed to delete video' });
        }
    },

    // Mark course as complete
    markCourseComplete: async (req, res) => {
        try {
            const courseId = req.params.id;
            const accountId = req.session.authUser.id;
            const instructor = await instructorModel.findByAccountId(accountId);

            // Verify course belongs to instructor
            const course = await db('courses')
                .where({
                    course_id: courseId,
                    instructor_id: instructor.instructor_id
                })
                .first();

            if (!course) {
                return res.json({ success: false, message: 'Course not found' });
            }

            // Validate course can be completed
            const completionCheck = await instructorController.canMarkCourseComplete(courseId);
            
            if (!completionCheck.canComplete) {
                return res.json({ 
                    success: false, 
                    message: completionCheck.reason 
                });
            }

            await db('courses')
                .where('course_id', courseId)
                .update({
                    is_complete: true,
                    latest_update: new Date()
                });

            res.json({ 
                success: true, 
                message: 'Course marked as complete successfully' 
            });
        } catch (error) {
            console.error('Error marking course complete:', error);
            res.json({ 
                success: false, 
                message: 'Failed to mark course as complete' 
            });
        }
    },

    // Check if course can be marked as complete
    canMarkCourseComplete: async (courseId) => {
        try {
            // Get all lectures for the course
            const lectures = await db('lecture')
                .where('course_id', courseId)
                .select('id', 'title');
            
            if (lectures.length === 0) {
                return {
                    canComplete: false,
                    reason: 'Course has no lectures'
                };
            }

            // Check each lecture has at least one video
            for (const lecture of lectures) {
                const videos = await db('video')
                    .where('lecture_id', lecture.id)
                    .first();
                
                if (!videos) {
                    return {
                        canComplete: false,
                        reason: `Lecture "${lecture.title || 'Untitled'}" has no videos`
                    };
                }
            }

            return {
                canComplete: true,
                reason: 'All lectures have videos'
            };
            
        } catch (error) {
            console.error('Error checking course completion:', error);
            return {
                canComplete: false,
                reason: 'Error checking course content'
            };
        }
    },

    // Show instructor profile management page
    showProfile: async (req, res) => {
        try {
            const accountId = req.session.authUser.id;
            
            // Validate instructor permission
            if (req.session.authUser.permission !== 2) {
                return res.redirect('/?error=access_denied');
            }

            // Get instructor profile with enhanced data
            const instructor = await instructorModel.findByAccountId(accountId);
            
            if (!instructor) {
                return res.status(404).render('error', {
                    message: 'Instructor profile not found'
                });
            }

            // Get enhanced profile data
            const enhancedInstructor = await instructorModel.getInstructorWithEnhancedData(instructor.instructor_id);

            // Get instructor's courses for display
            const courses = await instructorModel.getCoursesByInstructor(instructor.instructor_id);

            res.render('vwInstructor/profile', {
                layout: 'main',
                instructor: enhancedInstructor,
                courses: courses,
                success: req.query.success,
                error: req.query.error
            });

        } catch (error) {
            console.error('Error loading instructor profile:', error);
            res.status(500).render('error', {
                message: 'Unable to load instructor profile',
                error: process.env.NODE_ENV === 'development' ? error : {}
            });
        }
    },

    // Update the instructor profile
    updateProfile: async (req, res) => {
        try {
            console.log('🔄 Starting profile update process...');
            const accountId = req.session.authUser.id;
            
            // Validate instructor permission
            if (req.session.authUser.permission !== 2) {
                console.log('User does not have instructor permission');
                return res.redirect('/?error=access_denied');
            }

            console.log('Request body:', req.body);
            const { bio, expertise, name } = req.body;

            // Get instructor
            console.log('🔍 Finding instructor for account:', accountId);
            const instructor = await instructorModel.findByAccountId(accountId);
            
            if (!instructor) {
                console.log('Instructor not found for account:', accountId);
                return res.status(404).render('error', {
                    message: 'Instructor profile not found'
                });
            }

            console.log('Found instructor:', instructor.instructor_id);

            // Prepare update data
            const profileData = {
                bio: bio || '',
                expertise: expertise || '',
                name: name || instructor.name
            };

            console.log('Profile data to update:', profileData);

            // Update instructor profile with enhanced data storage
            console.log('Calling instructorModel.updateProfile...');
            const updateResult = await instructorModel.updateProfile(instructor.instructor_id, profileData);
        
            if (!updateResult) {
                console.log('instructorModel.updateProfile returned null/undefined');
                throw new Error('Failed to update instructor profile');
            }

            console.log('instructorModel.updateProfile succeeded:', updateResult);

            // Update session user data if name changed
            if (name && name !== req.session.authUser.name) {
                console.log('🔄 Updating session user name');
                req.session.authUser.name = name;
                
                // Also update account name
                console.log('🔄 Updating account name in database');
                const accountModel = (await import('../models/accout.model.js')).default;
                await accountModel.update(accountId, { name: name });
            }

            console.log('Profile update completed successfully');

            // Clear any cached data and redirect with success
            res.redirect('/instructor/profile?success=1');

        } catch (error) {
            console.error('Error updating instructor profile:', error);
            console.error('Error stack:', error.stack);
            res.redirect('/instructor/profile?error=1');
        }
    },

    // Get instructor's courses (API endpoint)
    getMyCourses: async (req, res) => {
        try {
            const accountId = req.session.authUser.id;
            
            // Validate instructor permission
            if (req.session.authUser.permission !== 2) {
                return res.json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const instructor = await instructorModel.findByAccountId(accountId);
            
            if (!instructor) {
                return res.json({
                    success: false,
                    message: 'Instructor profile not found'
                });
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            // Get courses with pagination
            const courses = await instructorModel.getCoursesByInstructorWithPagination(
                instructor.instructor_id, 
                limit, 
                offset
            );

            const totalCourses = await instructorModel.countCoursesByInstructor(instructor.instructor_id);
            const totalPages = Math.ceil(totalCourses / limit);

            res.json({
                success: true,
                data: {
                    courses: courses,
                    pagination: {
                        currentPage: page,
                        totalPages: totalPages,
                        totalCourses: totalCourses,
                        hasPrev: page > 1,
                        hasNext: page < totalPages
                    }
                }
            });

        } catch (error) {
            console.error('Error getting instructor courses:', error);
            res.json({
                success: false,
                message: 'Error fetching courses'
            });
        }
    },

    // Get instructor public profile (for course details page)
    getPublicProfile: async (req, res) => {
        try {
            const instructorId = req.params.id;

            const instructor = await instructorModel.getInstructorWithAccount(instructorId);
            
            if (!instructor) {
                return res.json({
                    success: false,
                    message: 'Instructor not found'
                });
            }

            // Get instructor's courses count and student count
            const courseCount = await instructorModel.countCoursesByInstructor(instructorId);
            const studentCount = await instructorModel.countStudentsByInstructor(instructorId);

            // Get recent courses
            const recentCourses = await instructorModel.getRecentCoursesByInstructor(instructorId, 5);

            res.json({
                success: true,
                data: {
                    instructor: instructor,
                    stats: {
                        courseCount: courseCount,
                        studentCount: studentCount,
                        rating: instructor.rating || 0,
                        reviewCount: instructor.review_count || 0
                    },
                    recentCourses: recentCourses
                }
            });

        } catch (error) {
            console.error('Error getting public instructor profile:', error);
            res.json({
                success: false,
                message: 'Error fetching instructor profile'
            });
        }
    },

    /* // Helper function
        validateProfileImage: (file) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 2 * 1024 * 1024; // 2MB
        
        if (!file) {
            return { valid: true }; // No file is okay
        }
        
        if (!allowedTypes.includes(file.mimetype)) {
            return { 
                valid: false, 
                error: 'Only JPG, PNG, GIF, and WebP images are allowed' 
            };
        }
        
        if (file.size > maxSize) {
            return { 
                valid: false, 
                error: 'Image size must be less than 2MB' 
            };
        }
        
        return { valid: true };
    } */
};

export default instructorController;