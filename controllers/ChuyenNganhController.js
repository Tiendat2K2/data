const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
exports.getChuyenNganh = async (req, res) => {
    try {
        const result = await pool.query('SELECT "IDChuyenNganh", "TenChuyenNganh", "UserID" FROM "ChuyenNganh"');
        res.status(200).json(result.rows); // Use 'rows' to access the result data in PostgreSQL
    } catch (error) {
        console.error('Lỗi khi lấy Chuyên Ngành:', error.message);
        res.status(500).json({ message: 'Có lỗi xảy ra khi lấy Chuyên Ngành.' });
    }
};
exports.addChuyenNganh = async (req, res) => {
    const { TenChuyenNganh, UserID } = req.body;

    // Check for missing fields
    if (!TenChuyenNganh || !UserID) {
        return res.status(400).json({ status: 0, message: 'Vui lòng cung cấp đầy đủ thông tin Tên Chuyên Ngành và UserID.' });
    }
    try {
        // Check if TenChuyenNganh already exists
        const checkExisting = await pool.query('SELECT COUNT(*) AS count FROM "ChuyenNganh" WHERE "TenChuyenNganh" = $1', [TenChuyenNganh]);

        if (checkExisting.rows[0].count > 0) {
            return res.status(400).json({ status: 0, message: 'Tên Chuyên Ngành đã tồn tại. Vui lòng nhập tên khác.' });
        }
        // Proceed to insert the new Chuyen Nganh
        await pool.query('INSERT INTO "ChuyenNganh" ("TenChuyenNganh", "UserID") VALUES ($1, $2)', [TenChuyenNganh, UserID]);

        res.status(201).json({ status: 1, message: 'Chuyên Ngành đã được thêm thành công!' });
    } catch (error) {
        console.error('Lỗi khi thêm Chuyên Ngành:', error.message);
        res.status(500).json({ status: 0, message: 'Có lỗi xảy ra khi thêm Chuyên Ngành.' });
    }
};
// Update Chuyen Nganh
exports.updateChuyenNganh = async (req, res) => {
    const { IDChuyenNganh, TenChuyenNganh, UserID } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!IDChuyenNganh || !TenChuyenNganh || !UserID) {
        return res.status(400).json({ 
            status: 0,
            message: "Vui lòng nhập đầy đủ các trường: IDChuyenNganh, TenChuyenNganh, UserID." 
        });
    }

    try {
        // Tạo mảng để lưu các thông báo lỗi
        const errors = [];

        // Kiểm tra IDChuyenNganh tồn tại
        const checkIDResult = await pool.query('SELECT * FROM "ChuyenNganh" WHERE "IDChuyenNganh" = $1', [IDChuyenNganh]);
        if (checkIDResult.rows.length === 0) {
            errors.push(`IDChuyenNganh ${IDChuyenNganh} không tồn tại`);
        }

        // Kiểm tra UserID tồn tại
        const checkUserIDResult = await pool.query('SELECT * FROM "Users" WHERE "UserID" = $1', [UserID]);
        if (checkUserIDResult.rows.length === 0) {
            errors.push(`UserID ${UserID} không tồn tại`);
        }

        // Nếu có lỗi về ID, trả về ngay
        if (errors.length > 0) {
            return res.status(404).json({
                status: 0,
                message: errors.join(' và ')
            });
        }

        // Kiểm tra TenChuyenNganh đã tồn tại
        const checkNameResult = await pool.query(
            'SELECT COUNT(*) AS count FROM "ChuyenNganh" WHERE "TenChuyenNganh" = $1 AND "IDChuyenNganh" <> $2',
            [TenChuyenNganh, IDChuyenNganh]
        );

        if (checkNameResult.rows[0].count > 0) {
            return res.status(400).json({
                status: 0,
                message: `Tên Chuyên Ngành "${TenChuyenNganh}" đã tồn tại. Vui lòng nhập tên khác.`
            });
        }

        // Nếu không có lỗi, tiến hành cập nhật
        const updateResult = await pool.query(
            'UPDATE "ChuyenNganh" SET "TenChuyenNganh" = $1, "UserID" = $2 WHERE "IDChuyenNganh" = $3 RETURNING *',
            [TenChuyenNganh, UserID, IDChuyenNganh]
        );

        // Trả về thông báo thành công
        res.status(200).json({
            status: 1,
            message: 'Chuyên Ngành đã được cập nhật thành công!',
            data: updateResult.rows[0]
        });

    } catch (error) {
        console.error('Lỗi khi cập nhật Chuyên Ngành:', error.message);
        res.status(500).json({
            status: 0,
            message: 'Có lỗi xảy ra khi cập nhật Chuyên Ngành.',
            error: error.message
        });
    }
};
// Delete Chuyen Nganh
exports.deleteChuyenNganh = async (req, res) => {
    const { IDChuyenNganh } = req.params; // Extract IDChuyenNganh from request parameters
    console.log(`Attempting to delete Chuyên Ngành with ID: ${IDChuyenNganh}`); // Add this line for debugging

    try {
        const result = await pool.query('DELETE FROM "ChuyenNganh" WHERE "IDChuyenNganh" = $1', [IDChuyenNganh]);

        // Check if any rows were affected
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Chuyên Ngành không tìm thấy.' });
        }

        res.status(200).json({ status: 1, message: 'Chuyên Ngành đã được xóa thành công!' });
    } catch (error) {
        console.error('Lỗi khi xóa Chuyên Ngành:', error.message);
        res.status(500).json({ message: 'Có lỗi xảy ra khi xóa Chuyên Ngành.' });
    }
};
// Get Chuyen Nganh Count
exports.getChuyenNganhCount = async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) AS "ChuyenNganhCount" FROM "ChuyenNganh"');
        const count = result.rows[0].ChuyenNganhCount;

        res.status(200).json({
            status: 1,
            message: 'Số lượng Chuyên Ngành đã được lấy thành công!',
            count: count,
        });
    } catch (error) {
        console.error('Lỗi khi lấy số lượng Chuyên Ngành:', error.message);
        res.status(500).json({ message: 'Có lỗi xảy ra khi lấy số lượng Chuyên Ngành.' });
    }
};