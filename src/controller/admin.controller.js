import bcrypt from 'bcrypt';
import accountModel from '../models/accout.model.js';
import categoryModel from '../models/category.model.js';
import courseModel from '../models/course.model.js';

const adminController = {
    // --- Dashboard ---
    dashboard: async (req, res) => {
        try {
            
            const totalUsers = await accountModel.countAll();
            const totalCourses = await courseModel.countAll();
            const totalCategories = await categoryModel.countAll();

     
            res.render('vwAdmin/dashboard', {
                layout: 'admin',
                stats: {
                    users: totalUsers,
                    courses: totalCourses,
                    categories: totalCategories
                }
            });
        } catch (error) {
            console.error("Lỗi khi tải dashboard:", error);
            res.redirect('/');
        }
    },

    // --- User Management ---
    viewUsers: async (req, res) => {
        try {
            const users = await accountModel.findAll(); 
            res.render('vwAdmin/users', { 
                layout: 'admin',
                users: users 
            });
        } catch (error) {
            console.error("Lỗi khi xem danh sách người dùng:", error);
            res.redirect('/admin');
        }
    },

    // --- Category Management ---
    viewCategories: async (req, res) => {
        try {
            // Lấy tất cả L1 và L2
            const { catL1, catL2 } = await categoryModel.findAllAdmin();
            // Lấy L1 để dùng cho modal "Thêm Lĩnh vực L2"
            const allL1 = await categoryModel.findAllL1();
            
            res.render('vwAdmin/categories', {
                layout: 'admin',
                catL1,
                catL2,
                allL1 // Gửi danh sách L1 sang view
            });
        } catch (error) {
            console.error("Lỗi khi xem danh sách lĩnh vực:", error);
            res.redirect('/admin');
        }
    },

    addCategory: async (req, res) => {
        try {
            const { category_name, slug, level, categoryL1_id } = req.body;
            const entity = { category_name, slug };
            
            if (level === 'L2') {
                // Đảm bảo id là số
                entity.categoryL1_id = parseInt(categoryL1_id, 10);
            } else {
                entity.categoryL1_id = null; // Bắt buộc là null nếu là L1
            }
            
            await categoryModel.add(entity);
        } catch (error) {
            console.error("Lỗi khi thêm lĩnh vực:", error);
            // Cần có thông báo lỗi cho người dùng (sẽ làm sau)
        }
        res.redirect('/admin/categories');
    },

    updateCategory: async (req, res) => {
        try {
            const { id, level, category_name, slug } = req.body;
            const data = { category_name, slug };
            await categoryModel.update(id, data, level);
        } catch (error) {
            console.error("Lỗi khi cập nhật lĩnh vực:", error);
        }
        res.redirect('/admin/categories');
    },

    deleteCategory: async (req, res) => {
        try {
            const { id, level } = req.body;
            
            // Chỉ kiểm tra xóa cho L2
            if (level === 'L2') {
                // Kiểm tra xem lĩnh vực này có khóa học nào không
                const count = await categoryModel.countCoursesInCategory(id);
                if (count > 0) {
                    console.log("Không thể xóa lĩnh vực L2 vì có khóa học.");
                    // Cần thêm flash message báo lỗi cho người dùng
                    return res.redirect('/admin/categories');
                }
            }
            // (Cần thêm logic kiểm tra L1 có L2 con không)
            
            await categoryModel.delete(id, level);
        } catch (error) {
            console.error("Lỗi khi xóa lĩnh vực:", error);
        }
        res.redirect('/admin/categories');
    },

    // --- Course Management (YÊU CẦU 4.2) ---
    // CÁC HÀM MỚI BẮT ĐẦU TỪ ĐÂY:
    viewCourses: async (req, res) => {
        try {
            // Gọi hàm model để lấy danh sách khóa học
            const courses = await courseModel.findAllAdmin();
            
            res.render('vwAdmin/courses', {
                layout: 'admin',
                courses: courses // Gửi dữ liệu sang view
            });
        } catch (error) {
            console.error("Lỗi khi xem danh sách khóa học:", error);
            res.redirect('/admin'); // Chuyển về dashboard nếu lỗi
        }
    },

    deleteCourse: async (req, res) => {
        try {
            const { id } = req.body; // Lấy id từ form post
            await courseModel.delete(id);
        } catch (error) {
            console.error("Lỗi khi xóa khóa học:", error);
        }
        res.redirect('/admin/courses');
    },
    setUserPermission: async (req, res) => {
        try {
            const { userId, permission } = req.body;
            await accountModel.update(userId, { permission: parseInt(permission, 10) });
        } catch (error) {
            console.error("Lỗi khi cấp quyền:", error);
        }
        res.redirect('/admin/users');
    },

    addUser: async (req, res) => {
        try {
            const { name, email, password, permission } = req.body;
            const hash = await bcrypt.hash(password, 10);
            const newUser = {
                name,
                email,
                password: hash,
                permission: parseInt(permission, 10)
            };
            await accountModel.add(newUser);
        } catch (error) {
            console.error("Lỗi khi thêm người dùng:", error);
        }
        res.redirect('/admin/users');
    },

    deleteUser: async (req, res) => {
        try {
            const { id } = req.body;
            await accountModel.deleteById(id);
        } catch (error) {
            console.error("Lỗi khi xóa người dùng:", error);
        }
        res.redirect('/admin/users');
    }
};

export default adminController;

