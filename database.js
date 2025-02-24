const mysql = require('mysql');

const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'puppeteer2',
    password: 'puppeteer2',
    database: 'puppeteer2'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to the database');
    }
});

function query(sql, args) {
    return new Promise((resolve, reject) => {
        db.query(sql, args, (err, result) => {
            if (err) {
                console.error('Database query error:', err);
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

module.exports = { db, query };