const express = require('express');
const cors = require('cors');
const setupSwagger = require('./swagger/swagger');
const sequelize = require("./config/database");
const authRoutes = require('./routes/authRoutest');
const chuyenNganhRoutes = require('./routes/ChuyenNganhRoutes');
const DulieuRoutes = require('./routes/DulieuRoutes');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// Cấu hình CORS
const corsOptions = {
    origin: ['https://data-e7wi.onrender.com', 'http://localhost:3000','http://localhost:3001', 'https://wesite-nine.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
};

app.use(cors(corsOptions));

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cấu hình thư mục uploads
const uploadDir = process.env.NODE_ENV === 'production'
    ? '/opt/render/project/src/uploads'
    : path.join(__dirname, 'uploads');

// Đảm bảo thư mục uploads tồn tại
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`✅ Created uploads directory at: ${uploadDir}`);
}

// Serve static files từ thư mục uploads
if (process.env.NODE_ENV === 'production') {
    app.use('/uploads', express.static('/opt/render/project/src/uploads'));
    console.log('✅ Serving uploads from production path');
} else {
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    console.log('✅ Serving uploads from development path');
}

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Middleware để log file operations
app.use((req, res, next) => {
    if (req.path.startsWith('/api/dulieu')) {
        console.log('File operation request:', {
            path: req.path,
            method: req.method,
            uploadDir,
            env: process.env.NODE_ENV
        });
    }
    next();
});

// Cấu hình Swagger
setupSwagger(app);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', chuyenNganhRoutes);
app.use('/api', DulieuRoutes);

// Test route cho uploads
app.get('/test-uploads', (req, res) => {
    const files = fs.readdirSync(uploadDir);
    res.json({
        uploadDir,
        files,
        env: process.env.NODE_ENV
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ 
        status: 0,
        message: 'Route không tồn tại' 
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ 
        status: 0,
        message: 'Đã xảy ra lỗi server', 
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
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
        throw error;
    }
}

// Start server
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://data-e7wi.onrender.com'
    : `http://localhost:${PORT}`;

async function startServer() {
    try {
        await initializeDatabase();
        
        // Kiểm tra quyền truy cập thư mục uploads
        try {
            fs.accessSync(uploadDir, fs.constants.R_OK | fs.constants.W_OK);
            console.log(`✅ Upload directory permissions verified: ${uploadDir}`);
        } catch (error) {
            console.error(`❌ Upload directory permissions error: ${error.message}`);
        }

        const server = app.listen(PORT, () => {
            console.log(`🚀 Server đang chạy tại ${BASE_URL}`);
            console.log(`📚 API Documentation: ${BASE_URL}/api-docs`);
            console.log(`📁 Upload directory: ${uploadDir}`);
        });

        // Graceful shutdown
        const shutdown = async () => {
            console.log('👋 Đang tắt server...');
            server.close(async () => {
                try {
                    await sequelize.close();
                    console.log('✅ Database connection closed');
                    console.log('✅ Server đã đóng');
                    process.exit(0);
                } catch (err) {
                    console.error('❌ Error during shutdown:', err);
                    process.exit(1);
                }
            });

            setTimeout(() => {
                console.error('❌ Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        console.error("❌ Lỗi khởi động server:", error);
        process.exit(1);
    }
}

startServer();

module.exports = app;