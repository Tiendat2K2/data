const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Sử dụng promise-based fs
const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

// Helper functions
const createFilePath = (file) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    return path.join('uploads', `${uniqueSuffix}${fileExt}`);
};

const getAbsolutePath = (relativePath) => {
    return process.env.NODE_ENV === 'production'
        ? path.join('/opt/render/project/src', relativePath)
        : path.join(__dirname, '..', relativePath);
};

const getContentType = (ext) => {
    const contentTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return contentTypes[ext.toLowerCase()] || 'application/octet-stream';
};

// Upload directory configuration
const uploadDir = process.env.NODE_ENV === 'production'
    ? '/opt/render/project/src/uploads'
    : path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
(async () => {
    try {
        await fs.mkdir(uploadDir, { recursive: true });
        console.log(`✅ Created uploads directory at: ${uploadDir}`);
    } catch (error) {
        console.error('❌ Error creating uploads directory:', error);
    }
})();

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExt = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${fileExt}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).single('Files');

// Controllers
exports.getDulieu = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM "Dulieu"');
        res.status(200).json({
            status: 1,
            message: 'Lấy dữ liệu thành công',
            data: result.rows
        });
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error);
        res.status(500).json({ 
            status: 0,
            message: 'Có lỗi xảy ra khi lấy dữ liệu.',
            error: error.message 
        });
    }
};

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
        console.error('Lỗi khi lấy dữ liệu theo UserID:', error);
        res.status(500).json({ 
            status: 0, 
            message: 'Đã xảy ra lỗi trong quá trình lấy dữ liệu theo UserID.',
            error: error.message
        });
    }
};

exports.addDulieu = async (req, res) => {
    upload(req, res, async function (err) {
        if (err) {
            return res.status(400).json({ 
                status: 0,
                message: err instanceof multer.MulterError 
                    ? (err.code === 'LIMIT_FILE_SIZE' ? 'File không được vượt quá 10MB!' : err.message)
                    : err.message
            });
        }

        try {
            if (!req.file) {
                return res.status(400).json({ 
                    status: 0,
                    message: 'Vui lòng upload file Word hoặc PDF!' 
                });
            }

            const { Tieude, UserID, ChuyenNganhID } = req.body;
            if (!Tieude || !UserID || !ChuyenNganhID) {
                await fs.unlink(req.file.path);
                return res.status(400).json({
                    status: 0,
                    message: 'Vui lòng điền đầy đủ thông tin bắt buộc!'
                });
            }

            const filePath = createFilePath(req.file);
            const absolutePath = getAbsolutePath(filePath);

            // Move file to final location
            await fs.rename(req.file.path, absolutePath);

            const result = await pool.query(
                'INSERT INTO "Dulieu" ("Tieude", "Files", "Nhomtacgia", "Tapchiuatban", "Thongtinmatpchi", "Namhoc", "Ghichu", "UserID", "ChuyenNganhID") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
                [
                    Tieude,
                    filePath,
                    req.body.Nhomtacgia || null,
                    req.body.Tapchiuatban || null,
                    req.body.Thongtinmatpchi || null,
                    req.body.Namhoc || null,
                    req.body.Ghichu || null,
                    UserID,
                    ChuyenNganhID
                ]
            );

            res.status(201).json({
                status: 1,
                message: 'Thêm dữ liệu thành công!',
                data: result.rows[0]
            });
        } catch (error) {
            if (req.file) {
                try {
                    await fs.unlink(req.file.path);
                } catch (unlinkError) {
                    console.error('Lỗi khi xóa file:', unlinkError);
                }
            }
            console.error('Lỗi:', error);
            res.status(500).json({
                status: 0,
                message: 'Lỗi khi thêm dữ liệu!',
                error: error.message
            });
        }
    });
};

exports.updateDulieu = async (req, res) => {
    upload(req, res, async function (err) {
        if (err) {
            return res.status(400).json({ 
                status: 0,
                message: err instanceof multer.MulterError 
                    ? (err.code === 'LIMIT_FILE_SIZE' ? 'File không được vượt quá 10MB!' : err.message)
                    : err.message
            });
        }

        try {
            const { ID } = req.params;
            const oldData = await pool.query('SELECT * FROM "Dulieu" WHERE "ID" = $1', [ID]);

            if (oldData.rows.length === 0) {
                if (req.file) {
                    await fs.unlink(req.file.path);
                }
                return res.status(404).json({
                    status: 0,
                    message: 'Không tìm thấy dữ liệu!'
                });
            }

            let newFilePath = oldData.rows[0].Files;
            if (req.file) {
                newFilePath = createFilePath(req.file);
                const absolutePath = getAbsolutePath(newFilePath);
                await fs.rename(req.file.path, absolutePath);

                // Delete old file
                const oldAbsolutePath = getAbsolutePath(oldData.rows[0].Files);
                try {
                    await fs.unlink(oldAbsolutePath);
                } catch (err) {
                    console.error('Lỗi khi xóa file cũ:', err);
                }
            }

            const result = await pool.query(
                'UPDATE "Dulieu" SET "Tieude" = $1, "Files" = $2, "Nhomtacgia" = $3, "Tapchiuatban" = $4, "Thongtinmatpchi" = $5, "Namhoc" = $6, "Ghichu" = $7, "UserID" = $8, "ChuyenNganhID" = $9 WHERE "ID" = $10 RETURNING *',
                [
                    req.body.Tieude || oldData.rows[0].Tieude,
                    newFilePath,
                    req.body.Nhomtacgia || oldData.rows[0].Nhomtacgia,
                    req.body.Tapchiuatban || oldData.rows[0].Tapchiuatban,
                    req.body.Thongtinmatpchi || oldData.rows[0].Thongtinmatpchi,
                    req.body.Namhoc || oldData.rows[0].Namhoc,
                    req.body.Ghichu || oldData.rows[0].Ghichu,
                    req.body.UserID || oldData.rows[0].UserID,
                    req.body.ChuyenNganhID || oldData.rows[0].ChuyenNganhID,
                    ID
                ]
            );

            res.status(200).json({
                status: 1,
                message: 'Cập nhật dữ liệu thành công!',
                data: result.rows[0]
            });
        } catch (error) {
            if (req.file) {
                try {
                    await fs.unlink(req.file.path);
                } catch (unlinkError) {
                    console.error('Lỗi khi xóa file:', unlinkError);
                }
            }
            console.error('Lỗi:', error);
            res.status(500).json({
                status: 0,
                message: 'Lỗi khi cập nhật dữ liệu!',
                error: error.message
            });
        }
    });
};

exports.deleteDulieu = async (req, res) => {
    try {
        const { ID } = req.params;
        
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

        if (fileResult.rows[0]?.Files) {
            const absolutePath = getAbsolutePath(fileResult.rows[0].Files);
            try {
                await fs.unlink(absolutePath);
            } catch (error) {
                console.error('Lỗi khi xóa file:', error);
            }
        }

        res.status(200).json({
            status: 1,
            message: 'Dữ liệu đã được xóa thành công!'
        });
    } catch (error) {
        console.error('Lỗi:', error);
        res.status(500).json({
            status: 0,
            message: 'Lỗi khi xóa dữ liệu.',
            error: error.message
        });
    }
};

exports.downloadFile = async (req, res) => {
    try {
        const { ID } = req.params;
        console.log('Downloading file for ID:', ID);

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

        const relativePath = result.rows[0].Files;
        const absolutePath = getAbsolutePath(relativePath);
        console.log('File path:', { relativePath, absolutePath });

        if (!await fs.access(absolutePath).then(() => true).catch(() => false)) {
            return res.status(404).json({
                status: 0,
                message: 'File không tồn tại hoặc không có quyền truy cập.'
            });
        }

        // Respond with a 200 status code to confirm the file was found
        res.status(200).json({
            status: 1,
            message: 'File đã được tìm thấy, bắt đầu tải về.'
        });

        // Set headers for file download
        const contentType = getContentType(path.extname(relativePath));
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(relativePath)}"`);

        // Stream the file
        const fileStream = fs.createReadStream(absolutePath);
        fileStream.on('error', (error) => {
            console.error('File stream error:', error);
            res.status(500).json({
                status: 0,
                message: 'Lỗi khi đọc file.',
                error: error.message
            });
        });

        fileStream.pipe(res);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            status: 0,
            message: 'Có lỗi xảy ra khi tải file.',
            error: error.message
        });
    }
};

exports.viewFile = async (req, res) => {
    try {
        const { ID } = req.params;
        console.log('Viewing file for ID:', ID);

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

        const relativePath = result.rows[0].Files;
        const absolutePath = getAbsolutePath(relativePath);
        console.log('File path:', { relativePath, absolutePath });

        if (!await fs.access(absolutePath).then(() => true).catch(() => false)) {
            return res.status(404).json({
                status: 0,
                message: 'File không tồn tại hoặc không có quyền truy cập.'
            });
        }

        const contentType = getContentType(path.extname(relativePath));
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'inline');

        const fileStream = fs.createReadStream(absolutePath);
        fileStream.on('error', (error) => {
            console.error('File stream error:', error);
            res.status(500).json({
                status: 0,
                message: 'Lỗi khi đọc file.',
                error: error.message
            });
        });

        fileStream.pipe(res);
    } catch (error) {
        console.error('View error:', error);
        res.status(500).json({
            status: 0,
            message: 'Có lỗi xảy ra khi xem file.',
            error: error.message
        });
    }
};

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
        console.error('Lỗi:', error);
        res.status(500).json({
            status: 0,
            message: 'Có lỗi xảy ra khi lấy số lượng bản ghi.',
            error: error.message
        });
    }
};
