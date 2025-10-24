export const loadCategories = async (req, res, next) => {
    // Sample categories data structure
    const categories = [
        {
            name: 'IT & Phần mềm',
            slug: 'it-software',
            subCategories: [
                { name: 'Lập trình Web', slug: 'web-development' },
                { name: 'Lập trình Mobile', slug: 'mobile-development' },
                { name: 'DevOps', slug: 'devops' }
            ]
        },
        {
            name: 'Kinh doanh',
            slug: 'business',
            subCategories: [
                { name: 'Khởi nghiệp', slug: 'startup' },
                { name: 'Quản lý dự án', slug: 'project-management' },
                { name: 'Kinh doanh online', slug: 'online-business' }
            ]
        },
        {
            name: 'Thiết kế',
            slug: 'design',
            subCategories: [
                { name: 'UI/UX Design', slug: 'ui-ux' },
                { name: 'Đồ họa', slug: 'graphic-design' },
                { name: '3D & Animation', slug: '3d-animation' }
            ]
        },
        {
            name: 'Marketing',
            slug: 'marketing',
            subCategories: [
                { name: 'Digital Marketing', slug: 'digital-marketing' },
                { name: 'Social Media', slug: 'social-media' },
                { name: 'SEO', slug: 'seo' }
            ]
        }
    ];
    res.locals.categories = categories;
    next();
};
