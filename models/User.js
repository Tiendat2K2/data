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
        allowNull: false,
        unique: true
    },
    Username: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
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
User.belongsTo(Role, { foreignKey: 'RoleID', as: 'role' });
module.exports = User;