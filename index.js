const express = require('express');
const cors = require('cors');
const setupSwagger = require('./swagger/swagger');
const sequelize = require("./config/database");
const authRoutes = require('./routes/authRoutest');
const chuyenNganhRoutes = require('./routes/ChuyenNganhRoutes');
const DulieuRoutes = require('./routes/DulieuRoutes');
const fs = require('fs');
const path = require('path');

const app = express();

// Cấu hình CORS đơn giản hơn cho development
const corsOptions = {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Cấu hình Swagger
setupSwagger(app);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', chuyenNganhRoutes);
app.use('/api', DulieuRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route không tồn tại' });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Đã xảy ra lỗi server', 
        error: err.message 
    });
});

// Database initialization
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log("✅ Kết nối CSDL thành công");

        await sequelize.sync({ alter: true });
        console.log("✅ Đã đồng bộ hóa các bảng");

        console.log("✅ Khởi tạo cơ sở dữ liệu hoàn tất");
    } catch (error) {
        console.error("❌ Lỗi khởi tạo cơ sở dữ liệu:", error);
        process.exit(1);
    }
}

// Start server
const PORT = 3000;
initializeDatabase().then(() => {
    const server = app.listen(PORT, () => {
        console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
        console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('👋 Đang tắt server...');
        server.close(() => {
            console.log('✅ Server đã đóng');
            process.exit(0);
        });
    });
}).catch(error => {
    console.error("❌ Lỗi khởi động server:", error);
    process.exit(1);
});

module.exports = app;