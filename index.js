const express = require('express');
const cors = require('cors');
const setupSwagger = require('./swagger/swagger');
const sequelize = require("./config/database");
const authRoutes = require('./routes/authRoutes');
const fs = require('fs');
const path = require('path');

const app = express();

// Cấu hình CORS: Cho phép yêu cầu từ một số nguồn cụ thể
const corsOptions = {
    origin: ['https://data-o14g.onrender.com'], // Thêm địa chỉ frontend nếu cần
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Các phương thức cho phép
    credentials: true, // Nếu sử dụng cookies
};
app.use(cors(corsOptions)); // Sử dụng các tùy chọn CORS đã cấu hình

// Middleware để ghi lại các yêu cầu
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Middleware để phân tích JSON
app.use(express.json());
setupSwagger(app);
app.use('/api/auth', authRoutes);  // Đường dẫn đến các route auth

// Đọc tất cả các file trong thư mục models
const modelsDir = path.join(__dirname, 'models');
const models = {};

// Đọc và tải các model
fs.readdirSync(modelsDir).forEach(file => {
  if (file.endsWith('.js') && file !== 'index.js') {
    const model = require(path.join(modelsDir, file));
    models[model.name] = model;
  }
});

// Thiết lập mối quan hệ giữa các model
Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

// Hàm khởi tạo cơ sở dữ liệu
async function initializeDatabase() {
  try {
    // Kết nối đến cơ sở dữ liệu
    await sequelize.authenticate();
    console.log("Kết nối CSDL thành công");
    
    // Đồng bộ hóa các model với cơ sở dữ liệu
    await sequelize.sync({ alter: true });
    console.log("Đã đồng bộ hóa các bảng");
    
    // Kiểm tra và thêm dữ liệu cho bảng Roles
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

// Khởi tạo cơ sở dữ liệu trước khi khởi động server
initializeDatabase().then(() => {
    initializeDatabase().then(() => {
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, '0.0.0.0', () => {
          console.log(`Server running on https://data-o14g.onrender.com`);
        });
    });
});

// Xuất app và models để có thể sử dụng ở nơi khác trong ứng dụng
module.exports = { app, models };
