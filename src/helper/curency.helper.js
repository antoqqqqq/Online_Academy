import Handlebars from 'handlebars';

// --- Currency helpers ---
const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(value * 23000);
};

const format_money = (value) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(value);
};

// --- New general helpers ---

// {{#times n}} ... {{/times}}
Handlebars.registerHelper('times', function (n, block) {
    let accum = '';
    for (let i = 1; i <= n; ++i) {
        accum += block.fn(i);
    }
    return accum;
});

// {{#if (eq a b)}}
Handlebars.registerHelper('eq', function (a, b) {
    return a === b;
});

// {{add a b}}
Handlebars.registerHelper('add', function (a, b) {
    return a + b;
});

// {{subtract a b}}
Handlebars.registerHelper('subtract', function (a, b) {
    return a - b;
});

// --- Export both object and full instance ---
const helpers = {
    format_currency: formatCurrency,
    format_money: format_money,
};

export { Handlebars };  // full instance (for app.engine)
export default helpers; // for direct imports if needed
