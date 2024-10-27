const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const ChuyenNganh = sequelize.define('ChuyenNganh', {
    IDChuyenNganh: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    TenChuyenNganh: {
        type: DataTypes.STRING(255)
    },
    UserID: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'UserID'
        }
    }
}, {
    tableName: 'ChuyenNganh',
    timestamps: false
});

// Thiết lập quan hệ giữa ChuyenNganh và Users
ChuyenNganh.belongsTo(User, { foreignKey: 'UserID', as: 'user' });

module.exports = ChuyenNganh;
