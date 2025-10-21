const adminController = {
    dashboard: (req, res) => {
        res.render('vwAdmin/dashboard', { layout: 'admin' });
    }
};

export default adminController;
