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

// {{multiply a b}}
Handlebars.registerHelper('multiply', function (a, b) {
    return a * b;
});

// {{divide a b}}
Handlebars.registerHelper('divide', function (a, b) {
    return b !== 0 ? a / b : 0;
});

// {{format_date date}}
Handlebars.registerHelper('format_date', function (date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
});

// {{format_time seconds}}
Handlebars.registerHelper('format_time', function (seconds) {
    if (!seconds || seconds < 0) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
});

// {{format_datetime date}}
Handlebars.registerHelper('format_datetime', function (date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// --- Export both object and full instance ---
const helpers = {
    format_currency: formatCurrency,
    format_money: format_money,
};

export { Handlebars };  // full instance (for app.engine)
export default helpers; // for direct imports if needed
