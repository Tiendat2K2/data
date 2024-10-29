require('dotenv').config();

const config = {
    development: {
        baseUrl: 'http://localhost:3000',
        env: 'development'
    },
    production: {
        baseUrl: 'https://data-e7wi.onrender.com',
        env: 'production'
    }
};
const environment = process.env.NODE_ENV || 'development';
module.exports = config[environment];