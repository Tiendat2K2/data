const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Role = require('./Role');

const User = sequelize.define('User', {
    UserID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    Email: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    Username: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    Password: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    RoleID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Role,
            key: 'RoleID'
        }
    },
    // Các cột khác...
    Hoten: DataTypes.STRING,
    Ngaysinh: DataTypes.DATE,
    Noisinh: DataTypes.STRING,
    Chuyenganh: DataTypes.STRING,
    Sonam: DataTypes.INTEGER,
    Gioitinh: DataTypes.STRING,
    Std: DataTypes.STRING,
    Tendonvi: DataTypes.STRING,
    Nganh: DataTypes.STRING,
    Img: DataTypes.STRING,
    RefreshToken: DataTypes.STRING(500),
    RefreshTokenExpiryTime: DataTypes.DATE,
    MGV: DataTypes.INTEGER
}, {
    tableName: 'Users',
    timestamps: false
});

// Thiết lập quan hệ giữa Users và Roles
User.belongsTo(Role, { foreignKey: 'RoleID', as: 'role' });

module.exports = User;
