const courseController = {
    list: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const categoryId = req.query.category;

            // Mock categories data
            const categories = [
                { id: 1, name: 'IT & Phần mềm' },
                { id: 2, name: 'Kinh doanh' },
                { id: 3, name: 'Thiết kế' },
                { id: 4, name: 'Marketing' }
            ];

            // Mock courses data
            const mockCourses = [
                {
                    id: 1,
                    title: 'Khóa học JavaScript Cơ bản',
                    thumbnail: 'https://picsum.photos/300/200',
                    instructor: 'John Doe',
                    category: 'IT & Phần mềm',
                    rating: 4.5,
                    reviewCount: 120,
                    price: 1200000,
                    discountPrice: 899000
                },
                {
                    id: 2,
                    title: 'Digital Marketing từ A-Z',
                    thumbnail: 'https://picsum.photos/300/200',
                    instructor: 'Jane Smith',
                    category: 'Marketing',
                    rating: 4.8,
                    reviewCount: 250,
                    price: 1500000,
                    discountPrice: null
                },
                {
                    id: 3,
                    title: 'UI/UX Design Master',
                    thumbnail: 'https://picsum.photos/300/200',
                    instructor: 'David Wilson',
                    category: 'Thiết kế',
                    rating: 4.7,
                    reviewCount: 180,
                    price: 2000000,
                    discountPrice: 1599000
                },
                {
                    id: 4,
                    title: 'Python cho người mới bắt đầu',
                    thumbnail: 'https://picsum.photos/300/200',
                    instructor: 'Sarah Johnson',
                    category: 'IT & Phần mềm',
                    rating: 4.6,
                    reviewCount: 300,
                    price: 1800000,
                    discountPrice: 1299000
                }
            ];


        } catch (error) {
            next(error);
        }
    }
};

export default courseController;