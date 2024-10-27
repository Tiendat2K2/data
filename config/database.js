const { Sequelize } = require('sequelize');
require('dotenv').config(); // Đọc biến môi trường từ .env

const sequelize = new Sequelize(process.env.POSTGRES_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false,         // Tắt logging nếu không cần
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false, // Nếu SSL được yêu cầu
        },
    },
});
(async () => {
    try {
        await sequelize.authenticate();
        console.log('Kết nối cơ sở dữ liệu thành công.');
    } catch (error) {
        console.error('Kết nối cơ sở dữ liệu thất bại:', error);
    }
})();

module.exports = sequelize;
