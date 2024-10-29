const express = require('express');
const cors = require('cors');
const setupSwagger = require('./swagger/swagger');
const sequelize = require("./config/database");
const authRoutes = require('./routes/authRoutes');
const chuyenNganhRoutes = require('./routes/ChuyenNganhRoutes');
const DulieuRoutes = require('./routes/DulieuRoutes');
const fs = require('fs');
const path = require('path');

const app = express();

<<<<<<< HEAD
// Cấu hình CORS
const corsOptions = {
  origin: [ 'https://wesite-nine.vercel.app', 'http://localhost:3000','http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};
app.use(cors(corsOptions));
=======
// Cấu hình CORS: Cho phép yêu cầu từ các nguồn cụ thể
const corsOptions = {
    origin: ['https://data-o14g.onrender.com', 'https://wesite-nine.vercel.app'], // Thêm các địa chỉ frontend cần thiết
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Các phương thức cho phép
    credentials: true, // Nếu sử dụng cookies
};
app.use(cors(corsOptions)); // Sử dụng các tùy chọn CORS đã cấu hình
>>>>>>> 4aab47b7b435d79655f49d335ca146f1524bb984

// Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});
app.use(express.json());
setupSwagger(app);

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api', chuyenNganhRoutes);
app.use('/api', DulieuRoutes);

// Load all models from the models directory
const modelsDir = path.join(__dirname, 'models');
const models = {}; // Initialize the models object

fs.readdirSync(modelsDir).forEach(file => {
  if (file.endsWith('.js') && file !== 'index.js') {
    const model = require(path.join(modelsDir, file));
    models[model.name] = model;
  }
});

// Set up associations between models
Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

// Initialize database and start server
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log("Kết nối CSDL thành công");
    await sequelize.sync({ alter: true });
    console.log("Đã đồng bộ hóa các bảng");
    const Role = models.Role;
    if (Role) {
      const roleCount = await Role.count();
      if (roleCount === 0) {
        await Role.bulkCreate([
          { RoleName: 'admin' },
          { RoleName: 'teacher' }
        ]);
        console.log("Đã thêm các role mặc định");
      } else {
        console.log("Dữ liệu role đã tồn tại, không cần thêm mới");
      }
    }
    console.log("Khởi tạo cơ sở dữ liệu hoàn tất");
  } catch (error) {
    console.error("Lỗi khi khởi tạo cơ sở dữ liệu:", error);
  }
}

initializeDatabase().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on https://data-o14g.onrender.com`);
    });
});

module.exports = { app, models };