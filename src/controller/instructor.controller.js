import courseModel from '../models/course.model.js';
import instructorModel from '../models/instructor.model.js';
import categoryModel from '../models/category.model.js';
import db from '../utils/db.js';

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

            // FIX: Get the next available course_id
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

            // Handle image upload - IMPROVED ERROR HANDLING
            if (req.file) {
                console.log('Uploaded file details:', {
                    filename: req.file.filename,
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    path: req.file.path
                });
                
                // Verify file was actually saved
                const fs = await import('fs');
                try {
                    await fs.promises.access(req.file.path);
                    courseData.image_url = `/uploads/courses/${req.file.filename}`;
                    console.log('Course image uploaded and verified:', courseData.image_url);
                } catch (fileError) {
                    console.error('Uploaded file not found:', fileError);
                    // Fall back to default image
                    courseData.image_url = '/upload/images/default-course.jpg';
                    console.log('Using default course image due to upload error');
                }
            } else {
                // Use default course image
                courseData.image_url = '/upload/images/default-course.jpg';
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
                        // If it's not valid JSON, use it as-is
                        displayFullDescription = course.full_description;
                    }
                } else if (typeof course.full_description === 'object') {
                    // If it's already an object (from model parsing)
                    displayFullDescription = course.full_description.content || JSON.stringify(course.full_description);
                }
            }

            const categories = await categoryModel.getAllForFilter();
            const lectures = await db('lecture')
                .where('course_id', courseId)
                .orderBy('id', 'asc');

            res.render('vwInstructor/editCourse', {
                layout: 'main',
                course: {
                    ...course,
                    full_description: displayFullDescription // Use parsed content for display
                },
                categories: categories,
                lectures: lectures,
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

            const courseId = req.params.id;
            const accountId = req.session.authUser.id;
            const instructor = await instructorModel.findByAccountId(accountId);

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

            console.log('Updating course:', courseId, 'with data:', { 
                title, category_id, level, original_price, current_price 
            });

            // Validation
            const errors = [];
            if (!title || title.trim().length === 0) {
                errors.push('Course title is required');
            }

            // Check if there's an upload error from Multer
            if (req.uploadError) {
                errors.push(req.uploadError);
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

            // Prepare update data
            const updateData = {
                title: title.trim(),
                description: description.trim(),
                category_id: parseInt(category_id),
                level: level,
                original_price: originalPrice,
                current_price: currentPrice,
                is_complete: is_complete === 'true',
                is_onsale: isOnSale,
                full_description: createFullDescriptionJSON(full_description),
                latest_update: new Date()
            };

            // Handle image upload
            if (req.file) {
                updateData.image_url = `/uploads/courses/${req.file.filename}`;
            }

            await db('courses')
                .where('course_id', courseId)
                .update(updateData);

            console.log('Course updated successfully:', courseId);

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

            // Let PostgreSQL handle the ID generation
            const lectureData = {
                course_id: courseId,
                title: title.trim(),
                description: description || '',
                is_preview: is_preview === 'true',
                time: time ? parseFloat(time) : 0,
                created_at: new Date()
            };

            console.log('Inserting lecture without specifying ID');

            const [newLecture] = await db('lecture')
                .insert(lectureData)
                .returning('*');

            console.log('Lecture created with ID:', newLecture.id);

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
                try {
                    // Reset the CORRECT sequence
                    await db.raw("SELECT setval('chapter_id_seq', (SELECT COALESCE(MAX(id), 1) FROM lecture), true)");
                    console.log('Sequence chapter_id_seq reset');
                } catch (seqError) {
                    console.error('Sequence reset failed:', seqError);
                }
                
                return res.json({ 
                    success: false, 
                    message: 'Please try adding the lecture again.' 
                });
            }
            
            res.json({ 
                success: false, 
                message: 'Failed to add lecture: ' + error.message 
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
                    latest_update: new Date()
                });

            res.json({ success: true, message: 'Lecture deleted successfully' });
        } catch (error) {
            console.error('Error deleting lecture:', error);
            res.json({ success: false, message: 'Failed to delete lecture' });
        }
    },

    // Update instructor profile
    updateProfile: async (req, res) => {
        try {
            const accountId = req.session.authUser.id;
            const instructor = await instructorModel.findByAccountId(accountId);

            const { bio } = req.body;

            await instructorModel.updateProfile(instructor.instructor_id, {
                bio: bio || ''
            });

            res.redirect('/instructor?success=1');
        } catch (error) {
            console.error('Error updating instructor profile:', error);
            res.redirect('/instructor?error=1');
        }
    }
};

export default instructorController;