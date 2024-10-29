const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const ChuyenNganh = require('./ChuyenNganh');

const Dulieu = sequelize.define('Dulieu', {
    ID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    Tieude: DataTypes.STRING(255),
    Files: DataTypes.TEXT,
    Nhomtacgia: DataTypes.STRING(255),
    Tapchiuatban: DataTypes.STRING(255),
    Thongtinmatpchi: DataTypes.TEXT,
    Ghichu: DataTypes.TEXT,
    UserID: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'UserID'
        }
    },
    ChuyenNganhID: {
        type: DataTypes.INTEGER,
        references: {
            model: ChuyenNganh,
            key: 'IDChuyenNganh'
        }
    },
    Namhoc: DataTypes.INTEGER
}, {
    tableName: 'Dulieu',
    timestamps: false
});
// Thiết lập quan hệ giữa Dulieu, Users, và ChuyenNganh
Dulieu.belongsTo(User, { foreignKey: 'UserID', as: 'user' });
Dulieu.belongsTo(ChuyenNganh, { foreignKey: 'ChuyenNganhID', as: 'chuyenNganh' });
module.exports = Dulieu;
