// models/index.js
const sequelize = require('../config/database');
const User = require('./User');
const Role = require('./Role');
const ChuyenNganh = require('./ChuyenNganh');
const Dulieu = require('./Dulieu');

// Khởi tạo các liên kết nếu cần
Role.hasMany(User, { foreignKey: 'RoleID' });
User.belongsTo(Role, { foreignKey: 'RoleID' });

User.hasMany(ChuyenNganh, { foreignKey: 'UserID' });
ChuyenNganh.belongsTo(User, { foreignKey: 'UserID' });

User.hasMany(Dulieu, { foreignKey: 'UserID' });
Dulieu.belongsTo(User, { foreignKey: 'UserID' });

ChuyenNganh.hasMany(Dulieu, { foreignKey: 'ChuyenNganhID' });
Dulieu.belongsTo(ChuyenNganh, { foreignKey: 'ChuyenNganhID' });

module.exports = {
    sequelize,
    User,
    Role,
    ChuyenNganh,
    Dulieu
};
