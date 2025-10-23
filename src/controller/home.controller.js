import categoryModel from "../models/category.model.js";

const homeController = {
    index: async (req, res, next) => {
        try {
            const data = {
                categories: await categoryModel.index(),

                banners: [
                    {
                        imageUrl: '/images/banners/banner1.jpg',
                        title: 'Learn Programming',
                        description: 'Start your coding journey with our comprehensive courses',
                        link: '/courses/programming'
                    },
                    {
                        imageUrl: '/images/banners/banner2.jpg',
                        title: 'Web Development',
                        description: 'Master modern web technologies',
                        link: '/courses/web-development'
                    },
                    {
                        imageUrl: '/images/banners/banner3.jpg',
                        title: 'Data Science',
                        description: 'Explore the world of data analytics',
                        link: '/courses/data-science'
                    }
                ],
                featuredCourses: [
                    {
                        id: 1,
                        title: 'JavaScript Fundamentals',
                        category: "Lập trình web",
                        rating: 4.5,
                        reviewCount: 120,
                        originalPrice: 49.99, // Đảm bảo giá là số
                        discountPrice: 39.99,  // Đảm bảo giá là số
                        instructor: 'John Doe',
                        thumbnailUrl: '/images/courses/js-basics.jpg'
                    },
                    {
                        id: 2,
                        title: 'Python for Beginners',
                        description: 'Start programming with Python',
                        category: "Lập trình web",
                        rating: 4.5,
                        reviewCount: 120,
                        originalPrice: 49.99, // Đảm bảo giá là số
                        discountPrice: 39.99,  // Đảm bảo giá là số
                        instructor: 'Jane Smith',
                        thumbnail: '/images/courses/python-basics.jpg'
                    }
                ],
                mostViewedCourses: [
                    {
                        id: 3,
                        title: 'React Complete Guide',
                        description: 'Master React.js development',
                        category: "Lập trình web",
                        rating: 4.5,
                        reviewCount: 120,
                        originalPrice: 49.99, // Đảm bảo giá là số
                        discountPrice: 39.99,  // Đảm bảo giá là số
                        instructor: 'Mike Johnson',
                        thumbnail: '/images/courses/react.jpg'
                    },
                    {
                        id: 4,
                        title: 'Node.js Advanced',
                        description: 'Advanced Node.js concepts',
                        category: "Lập trình web",
                        rating: 4.5,
                        reviewCount: 120,
                        originalPrice: 49.99, // Đảm bảo giá là số
                        discountPrice: 39.99,  // Đảm bảo giá là số
                        instructor: 'Sarah Wilson',
                        thumbnail: '/images/courses/nodejs.jpg'
                    }
                ],
                newestCourses: [
                    {
                        id: 5,
                        title: 'Vue.js for Beginners',
                        description: 'Learn Vue.js framework',
                        category: "Lập trình web",
                        rating: 4.5,
                        reviewCount: 120,
                        originalPrice: 49.99, // Đảm bảo giá là số
                        discountPrice: 39.99,  // Đảm bảo giá là số
                        instructor: 'Tom Brown',
                        thumbnail: '/images/courses/vuejs.jpg'
                    },
                    {
                        id: 6,
                        title: 'MongoDB Essentials',
                        description: 'Database design with MongoDB',
                        category: "Lập trình web",
                        rating: 4.5,
                        reviewCount: 120,
                        originalPrice: 49.99, // Đảm bảo giá là số
                        discountPrice: 39.99,  // Đảm bảo giá là số
                        instructor: 'Lisa Anderson',
                        thumbnail: '/images/courses/mongodb.jpg'
                    }
                ]
            };

            return data;
        } catch (error) {
            console.error('Home page error:', error);
            return res.status(500).render('error');
        }
    }
};
export default homeController;