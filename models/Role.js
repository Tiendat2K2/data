const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Giả sử bạn đã cấu hình Sequelize trong `database.js`

const Role = sequelize.define('Role', {
    RoleID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    RoleName: {
        type: DataTypes.STRING(50),
        allowNull: false
    }
}, {
    tableName: 'Roles',
    timestamps: false
});

module.exports = Role;
