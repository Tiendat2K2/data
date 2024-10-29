const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Tạo thư mục uploads nếu chưa tồn tại
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Cấu hình multer với kiểm tra file type
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const fileExt = path.extname(file.originalname);
        cb(null, `${Date.now()}-${path.basename(file.originalname, fileExt)}${fileExt}`);
    }
});
// Hàm kiểm tra file type
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file Word (.doc, .docx) hoặc PDF!'), false);
    }
};

// Cấu hình multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
}).single('Files');

// Hàm tạo đường dẫn file
const createFilePath = (file) => {
    if (!file) return null;
    return path.join('uploads', file.filename);
};

// Lấy tất cả dữ liệu
exports.getDulieu = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM "Dulieu"');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error.message);
        res.status(500).json({ message: 'Có lỗi xảy ra khi lấy dữ liệu.' });
    }
};

// Lấy dữ liệu theo UserID
exports.getDulieuID = async (req, res) => {
    try {
        const userId = req.params.UserID;
        const result = await pool.query(
            'SELECT * FROM "Dulieu" WHERE "UserID" = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                status: 0, 
                message: 'Không tìm thấy bản ghi.' 
            });
        }

        res.status(200).json({
            status: 1,
            message: 'Dữ liệu đã được lấy thành công.',
            data: result.rows
        });
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu theo UserID:', error.message);
        res.status(500).json({ 
            status: 0, 
            message: 'Đã xảy ra lỗi trong quá trình lấy dữ liệu theo UserID.' 
        });
    }
};

// Thêm dữ liệu mới
exports.addDulieu = async (req, res) => {
    upload(req, res, async function (err) {
        // Xử lý lỗi upload
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ 
                status: 0,
                message: err.code === 'LIMIT_FILE_SIZE' 
                    ? 'File không được vượt quá 10MB!' 
                    : 'Lỗi upload file: ' + err.message 
            });
        } else if (err) {
            return res.status(400).json({ 
                status: 0,
                message: err.message 
            });
        }

        // Kiểm tra file
        if (!req.file) {
            return res.status(400).json({ 
                status: 0,
                message: 'Vui lòng upload file Word hoặc PDF!' 
            });
        }

        // Kiểm tra các trường bắt buộc
        const { Tieude, UserID, ChuyenNganhID } = req.body;
        if (!Tieude || !UserID || !ChuyenNganhID) {
            // Xóa file đã upload nếu thiếu thông tin
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Lỗi khi xóa file:', err);
            });
            return res.status(400).json({
                status: 0,
                message: 'Vui lòng điền đầy đủ thông tin bắt buộc!'
            });
        }

        try {
            const filePath = createFilePath(req.file);
            const { 
                Nhomtacgia = null, 
                Tapchiuatban = null, 
                Thongtinmatpchi = null,
                Namhoc = null,
                Ghichu = null
            } = req.body;

            const result = await pool.query(
                'INSERT INTO "Dulieu" ("Tieude", "Files", "Nhomtacgia", "Tapchiuatban", "Thongtinmatpchi", "Namhoc", "Ghichu", "UserID", "ChuyenNganhID") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
                [Tieude, filePath, Nhomtacgia, Tapchiuatban, Thongtinmatpchi, Namhoc, Ghichu, UserID, ChuyenNganhID]
            );

            res.status(201).json({
                status: 1,
                message: 'Thêm dữ liệu thành công!',
                data: result.rows[0]
            });
        } catch (error) {
            // Xóa file nếu có lỗi
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Lỗi khi xóa file:', err);
                });
            }

            console.error('Lỗi khi thêm dữ liệu:', error.message);
            res.status(500).json({ 
                status: 0,
                message: 'Lỗi khi thêm dữ liệu!',
                error: error.message 
            });
        }
    });
};

// Cập nhật dữ liệu
exports.updateDulieu = async (req, res) => {
    upload(req, res, async function (err) {
        // Xử lý lỗi upload
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ 
                status: 0,
                message: err.code === 'LIMIT_FILE_SIZE' 
                    ? 'File không được vượt quá 10MB!' 
                    : 'Lỗi upload file: ' + err.message 
            });
        } else if (err) {
            return res.status(400).json({ 
                status: 0,
                message: err.message 
            });
        }

        try {
            const { ID } = req.params;
            
            // Kiểm tra dữ liệu tồn tại
            const checkResult = await pool.query(
                'SELECT * FROM "Dulieu" WHERE "ID" = $1',
                [ID]
            );

            if (checkResult.rows.length === 0) {
                if (req.file) {
                    fs.unlink(req.file.path, (err) => {
                        if (err) console.error('Lỗi khi xóa file:', err);
                    });
                }
                return res.status(404).json({ 
                    status: 0,
                    message: 'Không tìm thấy dữ liệu!' 
                });
            }

            const oldData = checkResult.rows[0];
            const oldFilePath = oldData.Files;

            // Lấy dữ liệu từ request body, giữ lại giá trị cũ nếu không có cập nhật
            const {
                Tieude = oldData.Tieude,
                Nhomtacgia = oldData.Nhomtacgia,
                Tapchiuatban = oldData.Tapchiuatban,
                Thongtinmatpchi = oldData.Thongtinmatpchi,
                Namhoc = oldData.Namhoc,
                Ghichu = oldData.Ghichu,
                UserID = oldData.UserID,
                ChuyenNganhID = oldData.ChuyenNganhID
            } = req.body;

            // Xử lý file mới nếu có
            let newFilePath = oldFilePath;
            if (req.file) {
                newFilePath = createFilePath(req.file);
            }
            const result = await pool.query(
                'UPDATE "Dulieu" SET ' +
                '"Tieude" = $1, ' +
                '"Files" = $2, ' +
                '"Nhomtacgia" = $3, ' +
                '"Tapchiuatban" = $4, ' +
                '"Thongtinmatpchi" = $5, ' +
                '"Namhoc" = $6, ' +
                '"Ghichu" = $7, ' +
                '"UserID" = $8, ' +
                '"ChuyenNganhID" = $9 ' +
                'WHERE "ID" = $10 RETURNING *',
                [Tieude, newFilePath, Nhomtacgia, Tapchiuatban, Thongtinmatpchi, 
                 Namhoc, Ghichu, UserID, ChuyenNganhID, ID]
            );

            // Xóa file cũ nếu có file mới
            if (req.file && oldFilePath && oldFilePath !== newFilePath) {
                fs.unlink(oldFilePath, (err) => {
                    if (err) console.error('Lỗi khi xóa file cũ:', err);
                });
            }

            res.status(200).json({
                status: 1,
                message: 'Cập nhật dữ liệu thành công!',
                data: result.rows[0]
            });

        } catch (error) {
            // Xóa file mới nếu có lỗi
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Lỗi khi xóa file:', err);
                });
            }
            console.error('Lỗi khi cập nhật dữ liệu:', error.message);
            res.status(500).json({ 
                status: 0,
                message: 'Lỗi khi cập nhật dữ liệu!',
                error: error.message 
            });
        }
    });
};

// Xóa dữ liệu
exports.deleteDulieu = async (req, res) => {
    try {
        const { ID } = req.params;
        
        // Lấy thông tin file trước khi xóa
        const fileResult = await pool.query(
            'SELECT "Files" FROM "Dulieu" WHERE "ID" = $1',
            [ID]
        );

        const result = await pool.query(
            'DELETE FROM "Dulieu" WHERE "ID" = $1 RETURNING *',
            [ID]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                status: 0,
                message: 'Không tìm thấy dữ liệu để xóa.' 
            });
        }

        // Xóa file nếu tồn tại
        if (fileResult.rows[0]?.Files) {
            fs.unlink(fileResult.rows[0].Files, (err) => {
                if (err) console.error('Lỗi khi xóa file:', err);
            });
        }

        res.status(200).json({ 
            status: 1,
            message: 'Dữ liệu đã được xóa thành công!' 
        });
    } catch (error) {
        console.error('Lỗi khi xóa dữ liệu:', error.message);
        res.status(500).json({ 
            status: 0,
            message: 'Lỗi khi xóa dữ liệu.',
            error: error.message 
        });
    }
};

// Đếm số lượng bản ghi
exports.getDulieuCount = async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) AS "DulieuCount" FROM "Dulieu"');
        const count = parseInt(result.rows[0].DulieuCount);

        res.status(200).json({
            status: 1,
            message: 'Số lượng Dulieu',
            count: count
        });
    } catch (error) {
        console.error('Lỗi khi lấy số lượng bản ghi:', error.message);
        res.status(500).json({ 
            status: 0,
            message: 'Có lỗi xảy ra khi lấy số lượng bản ghi.' 
        });
    }
};
exports.downloadFile = async (req, res) => {
    try {
        const { ID } = req.params;
        
        // Lấy thông tin file từ database
        const result = await pool.query(
            'SELECT "Files", "Tieude" FROM "Dulieu" WHERE "ID" = $1',
            [ID]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                status: 0,
                message: 'Không tìm thấy file.' 
            });
        }

        const filePath = result.rows[0].Files;
        
        // Kiểm tra file có tồn tại
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ 
                status: 0,
                message: 'File không tồn tại trên server.' 
            });
        }

        // Lấy tên file gốc
        const originalFileName = path.basename(filePath);

        // Set headers cho download
        res.setHeader('Content-Disposition', `attachment; filename="${originalFileName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');

        // Tạo read stream và pipe tới response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Lỗi khi tải file:', error.message);
        res.status(500).json({ 
            status: 0,
            message: 'Có lỗi xảy ra khi tải file.',
            error: error.message 
        });
    }
};

// Thêm hàm viewFile
exports.viewFile = async (req, res) => {
    try {
        const { ID } = req.params;
        
        // Lấy thông tin file từ database
        const result = await pool.query(
            'SELECT "Files" FROM "Dulieu" WHERE "ID" = $1',
            [ID]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                status: 0,
                message: 'Không tìm thấy file.' 
            });
        }

        const filePath = result.rows[0].Files;
        
        // Kiểm tra file có tồn tại
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ 
                status: 0,
                message: 'File không tồn tại trên server.' 
            });
        }

        // Xác định Content-Type dựa trên phần mở rộng của file
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        
        if (ext === '.pdf') {
            contentType = 'application/pdf';
        } else if (ext === '.doc') {
            contentType = 'application/msword';
        } else if (ext === '.docx') {
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }

        // Set headers cho view
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'inline');

        // Tạo read stream và pipe tới response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Lỗi khi xem file:', error.message);
        res.status(500).json({ 
            status: 0,
            message: 'Có lỗi xảy ra khi xem file.',
            error: error.message 
        });
    }
};