// In curency.helper.js - update the file
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

// --- Math helpers ---

// {{unless condition}} - opposite of if
Handlebars.registerHelper('unless', function (condition, options) {
    if (!condition) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

// {{parseInt value}} - convert to integer
Handlebars.registerHelper('parseInt', function (value) {
    return parseInt(value, 10);
});

// {{parseFloat value}} - convert to float
Handlebars.registerHelper('parseFloat', function (value) {
    return parseFloat(value);
});

// {{times n}} ... {{/times}} - loop n times
Handlebars.registerHelper('times', function (n, block) {
    let accum = '';
    for (let i = 1; i <= n; ++i) {
        accum += block.fn(i);
    }
    return accum;
});

// --- Comparison helpers ---

// {{#if (gt a b)}} - greater than
Handlebars.registerHelper('gt', function (a, b) {
    return a > b;
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

// {{#if (gte a b)}} - greater than or equal
Handlebars.registerHelper('gte', function (a, b) {
    return a >= b;
});

// {{#if (lt a b)}} - less than
Handlebars.registerHelper('lt', function (a, b) {
    return a < b;
});

// {{#if (lte a b)}} - less than or equal
Handlebars.registerHelper('lte', function (a, b) {
    return a <= b;
});

// {{#if (eq a b)}} - equal
Handlebars.registerHelper('eq', function (a, b) {
    return a === b;
});

// {{#if (neq a b)}} - not equal
Handlebars.registerHelper('neq', function (a, b) {
    return a !== b;
});

// --- Math operation helpers ---

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

// --- String helpers ---

// {{#if (includes str substr)}}
Handlebars.registerHelper('includes', function (str, substr) {
    if (typeof str === 'string' && typeof substr === 'string') {
        return str.includes(substr);
    }
    return false;
});

// {{format_datetime date}} - format date
Handlebars.registerHelper('format_datetime', function (date) {
    if (!date) return '';
    const dateObj = new Date(date);
    return dateObj.toLocaleString('vi-VN');
});

// {{format_date date}} - format date only
Handlebars.registerHelper('format_date', function (date) {
    if (!date) return '';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('vi-VN');
});

// --- Logic helpers ---

// {{#if (or a b)}}
Handlebars.registerHelper('or', function (a, b) {
    return a || b;
});

// {{#if (and a b)}}
Handlebars.registerHelper('and', function (a, b) {
    return a && b;
});

// {{#if (not a)}}
Handlebars.registerHelper('not', function (a) {
    return !a;
});

// {{ensureImageUrl url}} - ensure image URL is valid
Handlebars.registerHelper('ensureImageUrl', function (url) {
    if (!url || url === '' || url === '/upload/images/default-course.jpg') {
        return '/upload/images/default-course.jpg';
    }
    return url;
});

// --- Export both object and full instance ---
const helpers = {
    format_currency: formatCurrency,
    format_money: format_money,
    parseInt: function(value) {
        return parseInt(value, 10);
    },
    parseFloat: function(value) {
        return parseFloat(value);
    },
    times: function(n, block) {
        let accum = '';
        for (let i = 1; i <= n; ++i) {
            accum += block.fn(i);
        }
        return accum;
    },
    includes: function(str, substr) {
        if (typeof str === 'string' && typeof substr === 'string') {
            return str.includes(substr);
        }
        return false;
    },
    or: function(a, b) {
        return a || b;
    },
    and: function(a, b) {
        return a && b;
    },
    gt: function(a, b) {
        return a > b;
    },
    gte: function(a, b) {
        return a >= b;
    },
    lt: function(a, b) {
        return a < b;
    },
    lte: function(a, b) {
        return a <= b;
    },
    eq: function(a, b) {
        return a === b;
    },
    neq: function(a, b) {
        return a !== b;
    },
    add: function(a, b) {
        return a + b;
    },
    subtract: function(a, b) {
        return a - b;
    },
    multiply: function(a, b) {
        return a * b;
    },
    divide: function(a, b) {
        return b !== 0 ? a / b : 0;
    },
    format_datetime: function(date) {
        if (!date) return '';
        const dateObj = new Date(date);
        return dateObj.toLocaleString('vi-VN');
    },
    format_date: function(date) {
        if (!date) return '';
        const dateObj = new Date(date);
        return dateObj.toLocaleDateString('vi-VN');
    },
    ensureImageUrl: function(url) {
        if (!url || url === '' || url === '/upload/images/default-course.jpg') {
            return '/upload/images/default-course.jpg';
        }
        return url;
    }
};

export { Handlebars };  // full instance (for app.engine)
export default helpers; // for direct imports if needed