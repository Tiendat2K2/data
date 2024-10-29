const express = require('express');
const cors = require('cors');
const setupSwagger = require('./swagger/swagger');
const sequelize = require("./config/database");
const authRoutes = require('./routes/authRoutest');
const chuyenNganhRoutes = require('./routes/ChuyenNganhRoutes');
const DulieuRoutes = require('./routes/DulieuRoutes');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const app = express();

// Cấu hình CORS
const corsOptions = {
    origin: ['https://data-e7wi.onrender.com', 'http://localhost:3000', 'https://wesite-nine.vercel.app', '*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Add headers middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    next();
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Cấu hình Swagger
const swaggerSpec = setupSwagger(app);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', chuyenNganhRoutes);
app.use('/api', DulieuRoutes);

// 404 Handler
app.use((req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.status(404).json({ 
        status: 0,
        message: 'Route không tồn tại' 
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.header('Access-Control-Allow-Origin', '*');
    res.status(500).json({ 
        status: 0,
        message: 'Đã xảy ra lỗi server', 
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
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
        throw error; // Propagate error to be caught by the startup routine
    }
}

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await initializeDatabase();
        
        const server = app.listen(PORT, () => {
            console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
            console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
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

            // Force close after 10s
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

// Start the application
startServer();

module.exports = app;