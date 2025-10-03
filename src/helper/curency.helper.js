
const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(value * 23000);
};

const helpers = {
    format_currency: formatCurrency
};

export default helpers;