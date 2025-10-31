import db from '../utils/db.js';

export default {
    // Find instructor by account ID
    async findByAccountId(accountId) {
        try {
            const instructor = await db('instructor')
                .where('account_id', accountId)
                .first();
            return instructor;
        } catch (error) {
            console.error('Error finding instructor by account ID:', error);
            throw error;
        }
    },

    // Find instructor by instructor_id
    async findById(instructorId) {
        return db('instructor')
            .where('instructor_id', instructorId)
            .first();
    },

    // Create instructor profile - WORKING VERSION
    async createInstructor(accountId, name) {
        try {
            // Find the next available instructor_id
            const maxResult = await db('instructor')
                .max('instructor_id as max_id')
                .first();
            
            const nextId = (maxResult.max_id || 0) + 1;
            
            console.log(`Creating instructor with ID: ${nextId} for account: ${accountId}`);
            
            const [instructor] = await db('instructor')
                .insert({
                    instructor_id: nextId, // Explicitly set the ID
                    account_id: accountId,
                    name: name,
                    bio: '',
                    total_students: 0,
                    create_time: new Date()
                })
                .returning('*');
            
            console.log('Successfully created instructor:', instructor.instructor_id);
            return instructor;
        } catch (error) {
            console.error('Error creating instructor:', error);
            
            // If insertion fails, try to find existing instructor
            if (error.code === '23505') {
                console.log('Instructor might already exist, searching...');
                const existing = await this.findByAccountId(accountId);
                if (existing) {
                    console.log('Found existing instructor:', existing.instructor_id);
                    return existing;
                }
            }
            
            throw error;
        }
    },

    // Safe method to get or create instructor
    async getOrCreateInstructor(accountId, name) {
        try {
            // First, try to find existing instructor
            let instructor = await this.findByAccountId(accountId);
            
            if (instructor) {
                console.log('Found existing instructor:', instructor.instructor_id);
                return instructor;
            }
            
            // If not found, create new one
            console.log('No existing instructor found, creating new one...');
            instructor = await this.createInstructor(accountId, name);
            return instructor;
            
        } catch (error) {
            console.error('Error in getOrCreateInstructor:', error);
            
            // Final fallback - try one more time to find existing
            const existing = await this.findByAccountId(accountId);
            if (existing) {
                console.log('Fallback: Found existing instructor after error');
                return existing;
            }
            
            throw new Error(`Could not get or create instructor for account ${accountId}`);
        }
    },

    // Get courses by instructor with pagination
    async getCoursesByInstructorWithPagination(instructorId, limit = 10, offset = 0) {
        try {
            const courses = await db('courses')
                .where('instructor_id', instructorId)
                .select('*')
                .orderBy('latest_update', 'desc')
                .limit(limit)
                .offset(offset);

            return courses;
        } catch (error) {
            console.error('Error getting instructor courses with pagination:', error);
            throw error;
        }
    },

    // Get courses by instructor (simple version without pagination)
    async getCoursesByInstructor(instructorId) {
        try {
            console.log('🔍 getCoursesByInstructor called for instructor:', instructorId);
            const courses = await db('courses')
                .where('instructor_id', instructorId)
                .orderBy('latest_update', 'desc');
            console.log(`✅ Found ${courses.length} courses for instructor ${instructorId}`);
            return courses;
        } catch (error) {
            console.error('❌ Error in getCoursesByInstructor:', error);
            throw error;
        }
    },

    // Get courses by instructor
    async countCoursesByInstructor(instructorId) {
        try {
            const result = await db('courses')
                .where('instructor_id', instructorId)
                .count('course_id as count')
                .first();

            return parseInt(result.count) || 0;
        } catch (error) {
            console.error('Error counting instructor courses:', error);
            return 0;
        }
    },

    // Update instructor profile
    async updateProfile(instructorId, profileData) {
        try {
            console.log('Starting profile update for instructor:', instructorId);
            console.log('Profile data received:', profileData);
            // Prepare data for storage in existing bio column
            let enhancedBio = {};
            
            // Get current instructor data to preserve existing bio structure
             console.log('Getting current instructor data...');
            const currentInstructor = await db('instructor')
                .where('instructor_id', instructorId)
                .first();

            if (!currentInstructor) {
                console.log('Current instructor not found');
                throw new Error('Instructor not found');
            }
            
            console.log('Current instructor found:', currentInstructor);
            
            // Parse existing bio if it contains JSON data
            if (currentInstructor.bio) {
                try {
                    enhancedBio = JSON.parse(currentInstructor.bio);
                    console.log('Parsed existing bio as JSON:', enhancedBio);
                    // Ensure it's an object
                    if (typeof enhancedBio !== 'object' || enhancedBio === null) {
                        enhancedBio = { original_bio: currentInstructor.bio };
                        console.log('Converted bio to object format');
                    }
                } catch (e) {
                    // If not JSON, store as original bio
                    console.log('Existing bio is not JSON, using as plain text');
                    enhancedBio = { original_bio: currentInstructor.bio };
                }
            } else {
                console.log('No existing bio found');
            }
            
            // Update with new data - store everything in bio column as JSON
            const updatedBioData = {
                // Preserve original bio text if it exists
                ...enhancedBio,
                // Update with new profile data
                bio_text: profileData.bio || enhancedBio.bio_text || '',
                expertise: profileData.expertise || enhancedBio.expertise || '',
                last_updated: new Date().toISOString()
            };

            console.log('Updated bio data structure:', updatedBioData);
            
            // Prepare update data for database - only use existing columns
            const dbUpdateData = {
                bio: JSON.stringify(updatedBioData),
                create_time: new Date()
            };
            
            // If name is provided, update the name column separately
            if (profileData.name) {
                dbUpdateData.name = profileData.name;
                console.log('Will update name to:', profileData.name);
            }

            console.log('Database update data:', dbUpdateData);

            console.log('Executing database update...');
            const result = await db('instructor')
                .where('instructor_id', instructorId)
                .update(dbUpdateData)
                .returning('*');

            console.log('Database update result:', result);

            // Return the updated instructor
            const updatedInstructor = await db('instructor')
                .where('instructor_id', instructorId)
                .first();
                
            console.log('Final updated instructor:', updatedInstructor);
            return updatedInstructor;
        } catch (error) {
            console.error('Error updating instructor profile:', error);
            console.error('Error stack in model:', error.stack);
            throw error;
        }
    },

    // Get instructor with account info
    async getInstructorWithAccount(instructorId) {
        try {
            const instructor = await db('instructor')
                .join('account', 'instructor.account_id', 'account.id')
                .where('instructor.instructor_id', instructorId)
                .select('instructor.*', 'account.name', 'account.email')
                .first();
            return instructor;
        } catch (error) {
            console.error('Error getting instructor with account:', error);
            throw error;
        }
    },

    // Count students by instructor (students enrolled in instructor's courses)
    async countStudentsByInstructor(instructorId) {
        try {
            const result = await db('enrollment')
                .join('courses', 'enrollment.course_id', 'courses.course_id')
                .where('courses.instructor_id', instructorId)
                .countDistinct('enrollment.student_id as count')
                .first();

            return parseInt(result.count) || 0;
        } catch (error) {
            console.error('Error counting instructor students:', error);
            return 0;
        }
    },

    // Get recent courses by instructor
    async getRecentCoursesByInstructor(instructorId, limit = 5) {
        try {
            const courses = await db('courses')
                .where('instructor_id', instructorId)
                .select('course_id', 'title', 'image_url', 'rating', 'total_reviews')
                .orderBy('latest_update', 'desc')
                .limit(limit);

            return courses;
        } catch (error) {
            console.error('Error getting recent instructor courses:', error);
            return [];
        }
    },

    // Get instructor profile for public view (course details page)
    async getInstructorPublicProfile(instructorId) {
        try {
            const instructor = await db('instructor')
                .where('instructor_id', instructorId)
                .first();

            if (!instructor) {
                return null;
            }

            // Get course count
            const courseCount = await this.countCoursesByInstructor(instructorId);
            
            // Get student count
            const studentCount = await this.countStudentsByInstructor(instructorId);
            
            // Get average rating
            const ratingResult = await db('courses')
                .where('instructor_id', instructorId)
                .avg('rating as average')
                .first();
            const averageRating = parseFloat(ratingResult.average || 0).toFixed(1);

            return {
                ...instructor,
                stats: {
                    courseCount,
                    studentCount,
                    averageRating
                }
            };
        } catch (error) {
            console.error('Error getting public instructor profile:', error);
            return null;
        }
    },

    // Get other courses by instructor (excluding current course)
    async getOtherCoursesByInstructor(instructorId, excludeCourseId, limit = 4) {
        try {
            const courses = await db('courses')
                .where('instructor_id', instructorId)
                .where('course_id', '!=', excludeCourseId)
                .select('course_id', 'title', 'image_url', 'rating', 'total_enrollment')
                .orderBy('total_enrollment', 'desc')
                .limit(limit);

            // Ensure all courses have proper image URLs
            return courses.map(course => ({
                ...course,
                image_url: course.image_url && course.image_url !== '' ? 
                    course.image_url : '/upload/images/default-course.jpg'
            }));
        } catch (error) {
            console.error('Error getting other instructor courses:', error);
            return [];
        }
    },

    // Get all instructors (for admin purposes)
    async getAllInstructors(limit = 50, offset = 0) {
        try {
            const instructors = await db('instructor')
                .join('account', 'instructor.account_id', 'account.id')
                .select(
                    'instructor.*',
                    'account.name as account_name',
                    'account.email',
                    'account.created_at as account_created_at'
                )
                .limit(limit)
                .offset(offset);

            return instructors;
        } catch (error) {
            console.error('Error getting all instructors:', error);
            return [];
        }
    },

    // Enhanced method to get instructor profile with parsed data
    async getInstructorWithEnhancedData(instructorId) {
        try {
            const instructor = await db('instructor')
                .where('instructor_id', instructorId)
                .first();

            if (!instructor) {
                return null;
            }

            // Parse the enhanced bio data
            let profileData = {
                instructor_id: instructor.instructor_id,
                name: instructor.name,
                bio: '',
                expertise: '',
                total_students: instructor.total_students,
                account_id: instructor.account_id,
                create_time: instructor.create_time
            };

            if (instructor.bio) {
                try {
                    const parsedBio = JSON.parse(instructor.bio);
                    
                    // Handle both old format (string) and new format (object)
                    if (typeof parsedBio === 'object' && parsedBio !== null) {
                        profileData.bio = parsedBio.bio_text || parsedBio.original_bio || '';
                        profileData.expertise = parsedBio.expertise || '';
                    } else {
                        profileData.bio = instructor.bio;
                    }
                } catch (e) {
                    // If not JSON, use as plain bio
                    profileData.bio = instructor.bio;
                }
            }

            return profileData;
        } catch (error) {
            console.error('Error getting enhanced instructor data:', error);
            return null;
        }
    },

    // Temporary method to migrate existing instructor data
    async migrateInstructorData() {
        try {
            const instructors = await db('instructor').select('*');
            
            for (const instructor of instructors) {
                if (instructor.bio && !instructor.bio.startsWith('{')) {
                    // This is old format data, migrate it
                    const enhancedBio = {
                        original_bio: instructor.bio,
                        bio_text: instructor.bio,
                        expertise: '',
                        website: '',
                        linkedin: '',
                        twitter: '',
                        profile_picture: '',
                        migrated_at: new Date().toISOString()
                    };
                    
                    await db('instructor')
                        .where('instructor_id', instructor.instructor_id)
                        .update({
                            bio: JSON.stringify(enhancedBio)
                        });
                    
                    console.log(`Migrated instructor ${instructor.instructor_id}`);
                }
            }
            
            console.log('Instructor data migration completed');
        } catch (error) {
            console.error('Error migrating instructor data:', error);
        }
    },
    async getAllInstructorsSimple() {
        try {
            const instructors = await db('instructor')
                .select('instructor_id', 'name')
                .orderBy('name', 'asc');

            return instructors;
        } catch (error) {
            console.error('Error getting all instructors simple:', error);
            return [];
        }
    },
};