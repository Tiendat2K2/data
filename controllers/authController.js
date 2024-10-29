const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
exports.register = async (req, res) => {
    const { Email, Username, Password } = req.body;

    if (!Email || !Username || !Password) {
        return res.status(400).json({ message: 'Vui lòng nhập tất cả các trường!' });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(Email)) {
        return res.status(400).json({ message: 'Địa chỉ email không hợp lệ! Vui lòng kiểm tra định dạng email của bạn.' });
    }

    let client;
    try {
        client = await pool.connect();
        const hashedPassword = await bcrypt.hash(Password, 10);

        const emailQuery = 'SELECT * FROM "Users" WHERE "Email" = $1';
        const emailResult = await client.query(emailQuery, [Email]);
        if (emailResult.rows.length > 0) {
            return res.status(400).json({ message: 'Email đã được đăng ký!' });
        }

        const usernameQuery = 'SELECT * FROM "Users" WHERE "Username" = $1';
        const usernameResult = await client.query(usernameQuery, [Username]);
        if (usernameResult.rows.length > 0) {
            return res.status(400).json({ message: 'Username đã được đăng ký!' });
        }

        const countQuery = 'SELECT COUNT(*) FROM "Users"';
        const countResult = await client.query(countQuery);
        const userCount = parseInt(countResult.rows[0].count, 10);
        const roleID = userCount === 0 ? 1 : 2;

        const insertQuery = 'INSERT INTO "Users" ("Username", "Email", "Password", "RoleID") VALUES ($1, $2, $3, $4)';
        await client.query(insertQuery, [Username, Email, hashedPassword, roleID]);
        res.status(200).json({ status: 1, message: 'Đăng ký thành công!', roleID: roleID });
    } catch (err) {
        console.error('Đăng ký lỗi:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};
exports.login = async (req, res) => {
    const { Username, Password } = req.body;
    if (!Username || !Password) {
        return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu!' });
    }

    let client;
    try {
        client = await pool.connect();
        const queryText = 'SELECT "UserID", "RoleID", "Email", "Username", "Password" FROM "Users" WHERE "Username" = $1';
        const result = await client.query(queryText, [Username]);

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Sai tên đăng nhập hoặc mật khẩu!' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(Password, user.Password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Sai tên đăng nhập hoặc mật khẩu!' });
        }

        const access_token = jwt.sign(
            { id: user.UserID, roleId: user.RoleID },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '300d' }
        );

        const refresh_token = jwt.sign(
            { id: user.UserID, roleId: user.RoleID },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '365d' }
        );
        // Update refresh token in the database
        const updateQuery = 'UPDATE "Users" SET "RefreshToken" = $1 WHERE "UserID" = $2';
        await client.query(updateQuery, [refresh_token, user.UserID]);

        res.json({
            status: 1,
            message: 'Đăng nhập thành công!',
            access_token,
            refresh_token
        });
    } catch (err) {
        console.error('Đăng nhập lỗi:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};
exports.refreshToken = async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) {
        return res.status(400).json({ message: 'Cần có refresh token' });
    }

    let client;
    try {
        client = await pool.connect();

        // Verify the refresh token
        const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET);

        // Fetch the refresh token from the database
        const query = 'SELECT "UserID", "RefreshToken" FROM "Users" WHERE "UserID" = $1';
        const { rows } = await client.query(query, [decoded.id]);
        const dbToken = rows[0];

        if (!dbToken || dbToken.RefreshToken !== refresh_token) {
            return res.status(401).json({ message: 'Refresh token không hợp lệ hoặc đã hết hạn' });
        }

        // Generate a new access token
        const access_token = jwt.sign(
            { id: decoded.id, roleId: decoded.roleId },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '30s' }
        );

        // Generate a new refresh token
        const new_refresh_token = jwt.sign(
            { id: decoded.id, roleId: decoded.roleId },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        // Update refresh token in the database
        const updateQuery = 'UPDATE "Users" SET "RefreshToken" = $1 WHERE "UserID" = $2';
        await client.query(updateQuery, [new_refresh_token, decoded.id]);

        res.json({
            status: 1,
            message: 'Làm mới token thành công',
            access_token,
            refresh_token: new_refresh_token
        });

    } catch (err) {
        console.error('Lỗi làm mới token:', err);
        res.status(401).json({ message: 'Refresh token không hợp lệ hoặc đã hết hạn' });
    } finally {
        if (client) {
            client.release();
        }
    }
};
exports.resetTeacherPassword = async (req, res) => {
    const { UserID } = req.params;

    if (!UserID) {
        return res.status(400).json({ message: 'Vui lòng cung cấp UserID!' });
    }

    let client;
    try {
        client = await pool.connect();

        // Kiểm tra xem giáo viên có tồn tại không
        const userCheck = await client.query(
            'SELECT * FROM "Users" WHERE "UserID" = $1 AND "RoleID" = $2',
            [UserID, 2] // Assuming RoleID for teachers is 2
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy giáo viên với UserID đã cho!' });
        }

        // Mật khẩu mặc định
        const defaultPassword = '1111';

        // Mã hóa mật khẩu mặc định
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        // Cập nhật mật khẩu mới
        await client.query(
            'UPDATE "Users" SET "Password" = $1 WHERE "UserID" = $2 AND "RoleID" = $3',
            [hashedPassword, UserID, 2]
        );

        res.status(200).json({
            status: 1,
            message: 'Đặt lại mật khẩu giáo viên thành công!'
        });
    } catch (err) {
        console.error('Lỗi đặt lại mật khẩu giáo viên:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    } finally {
        if (client) {
            client.release(); // Release the client back to the pool
        }
    }
};

exports.sendVerificationEmail = async (req, res) => {
    const { Email } = req.body;

    if (!Email) {
        return res.status(400).json({ message: 'Vui lòng cung cấp địa chỉ email!' });
    }

    try {
        const client = await pool.connect();

        try {
            const userResult = await client.query(
                'SELECT "UserID" FROM "Users" WHERE "Email" = $1',
                [Email]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({ message: 'Không tìm thấy tài khoản với email đã cho!' });
            }

            const newPassword = generateRandomPassword(10);
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);

            await client.query(
                'UPDATE "Users" SET "Password" = $1 WHERE "UserID" = $2',
                [hashedNewPassword, userResult.rows[0].UserID]
            );

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: Email,
                subject: 'Mật khẩu mới của bạn',
                text: `Mật khẩu mới của bạn là: ${newPassword}`,
            };

            await transporter.sendMail(mailOptions);

            res.status(200).json({ status: 1, message: 'Mật khẩu mới đã được gửi tới email của bạn!' });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Lỗi khi đặt lại mật khẩu:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    }
};
function generateRandomPassword(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return password;
}
exports.getAllUsers = async (req, res) => {
    let client; // Khai báo client ở đầu hàm
    try {
        client = await pool.connect();

        const result = await client.query(
            'SELECT "UserID", "Hoten", "Ngaysinh", "Noisinh", "Chuyenganh", "Sonam", "Gioitinh", "Std", "Tendonvi", "Nganh", "Img", "MGV" FROM "Users" WHERE "RoleID" = $1',
            [2]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng nào!' });
        }

        res.status(200).json({
            status: 1,
            message: 'Danh sách người dùng',
            data: result.rows
        });
    } catch (err) {
        console.error('Lỗi lấy danh sách người dùng:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};
exports.getUserById = async (req, res) => {
    const UserID = req.params.id; // Get UserID from request parameters

    let client;
    try {
        client = await pool.connect();
        // SQL query to fetch user information by ID
        const result = await client.query(
            `SELECT 
                "Hoten",
                "Ngaysinh",
                "Noisinh",
                "Chuyenganh",
                "Sonam",
                "Gioitinh",
                "Std",
                "Tendonvi",
                "Nganh",
                "Img",
                "MGV"
             FROM 
                "Users"
             WHERE 
                "UserID" = $1`,
            [UserID]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
        }

        res.status(200).json({
            status: 1,
            message: 'Thông tin người dùng',
            data: result.rows[0] // Return the found user
        });
    } catch (err) {
        console.error('Lỗi lấy người dùng:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};
exports.getUserCount = async (req, res) => {
    let client;
    try {
        client = await pool.connect();

        const result = await client.query('SELECT COUNT(*) AS "UserCount" FROM "Users"');

        // Return the user count
        res.status(200).json({
            status: 1,
            message: 'Số lượng người dùng',
            userCount: parseInt(result.rows[0].UserCount, 10) // Convert to integer
        });
    } catch (err) {
        console.error('Lỗi lấy số lượng người dùng:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    } finally {
        if (client) {
            client.release(); // Release the client back to the pool
        }
    }
};
exports.getTeachers = async (req, res) => {
    let client;
    try {
        client = await pool.connect();

        const result = await client.query(`
            SELECT 
                "UserID", 
                "Email", 
                "Username", 
                "Std"
            FROM "Users" 
            WHERE "RoleID" = $1
        `, [2]); // Assuming RoleID for teachers is 2

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy giáo viên nào!' });
        }

        res.status(200).json({
            status: 1,
            message: 'Danh sách giáo viên',
            data: result.rows // Access the data from result.rows
        });
    } catch (err) {
        console.error('Lỗi lấy danh sách giáo viên:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    } finally {
        if (client) {
            client.release(); // Release the client back to the pool
        }
    }
};
exports.updatePassword = async (req, res) => {
    const { UserID, oldPassword, newPassword } = req.body;

    if (!UserID || !oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Vui lòng nhập tất cả các trường!' });
    }

    let client;
    try {
        client = await pool.connect();

        const user = await client.query('SELECT "Password" FROM "Users" WHERE "UserID" = $1', [UserID]);

        if (user.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
        }

        const validPassword = await bcrypt.compare(oldPassword, user.rows[0].Password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Mật khẩu cũ không chính xác!' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await client.query('UPDATE "Users" SET "Password" = $1 WHERE "UserID" = $2', [hashedNewPassword, UserID]);

        res.status(200).json({ status: 1, message: 'Cập nhật mật khẩu thành công!' });
    } catch (err) {
        console.error('Lỗi cập nhật mật khẩu:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    } finally {
        if (client) {
            client.release(); // Release the client back to the pool
        }
    }
};
exports.updateTeacher = async (req, res) => {
    let { UserID, Email, Username, Std } = req.body;

    if (!UserID) {
        return res.status(400).json({ status: 0, message: 'Vui lòng cung cấp UserID!' });
    }
    // Trim excess whitespace
    if (Email) Email = Email.trim();
    if (Username) Username = Username.trim();
    if (Std) Std = Std.trim();
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (Email && !gmailRegex.test(Email)) {
        return res.status(400).json({ status: 0, message: 'Vui lòng nhập đúng định dạng email Gmail!' });
    }
    
    const client = await pool.connect();
    try {
        // Check if the teacher exists
        const userCheck = await client.query('SELECT * FROM "Users" WHERE "UserID" = $1 AND "RoleID" = 2', [UserID]);

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ status: 0, message: 'Không tìm thấy giáo viên với UserID đã cho!' });
        }

        // Check Email
        if (Email) {
            const emailCheck = await client.query('SELECT * FROM "Users" WHERE "Email" = $1 AND "UserID" != $2', [Email, UserID]);

            if (emailCheck.rows.length > 0) {
                return res.status(400).json({ status: 0, message: 'Email đã tồn tại!' });
            }
        }

        // Check Username
        if (Username) {
            const usernameCheck = await client.query('SELECT * FROM "Users" WHERE "Username" = $1 AND "UserID" != $2', [Username, UserID]);

            if (usernameCheck.rows.length > 0) {
                return res.status(400).json({ status: 0, message: 'Username đã tồn tại!' });
            }
        }

        // Check Std
        if (Std) {
            const stdCheck = await client.query('SELECT * FROM "Users" WHERE "Std" = $1 AND "UserID" != $2', [Std, UserID]);

            if (stdCheck.rows.length > 0) {
                return res.status(400).json({ status: 0, message: 'Số điện thoại đã tồn tại!' });
            }
        }

        // Prepare update query
        let query = 'UPDATE "Users" SET ';
        const params = [];
        let setClauses = [];

        if (Email) {
            setClauses.push('"Email" = $1');
            params.push(Email);
        }
        if (Username) {
            setClauses.push('"Username" = $2');
            params.push(Username);
        }
        if (Std) {
            setClauses.push('"Std" = $3');
            params.push(Std);
        }

        // Construct the query string
        query += setClauses.join(', ') + ' WHERE "UserID" = $4 AND "RoleID" = 2';
        params.push(UserID); // Add UserID as the last parameter

        await client.query(query, params);

        res.status(200).json({ 
            status: 1, 
            message: 'Cập nhật thông tin giáo viên thành công!'
        });
    } catch (err) {
        console.error('Lỗi cập nhật thông tin giáo viên:', err);
        res.status(500).json({ status: 0, message: 'Lỗi máy chủ', error: err.message });
    } finally {
        client.release(); // Release the client back to the pool
    }
};
exports.updateUser = async (req, res) => {
    const { UserID } = req.body;
    let Img = null;
    // Handle the image upload if it exists
    if (req.file) {
        Img = req.file.path.replace(/\\/g, '/'); // Normalize the path for PostgreSQL
    }
    // Validate UserID
    if (!UserID) {
        return res.status(400).json({ message: 'Vui lòng cung cấp UserID!' });
    }
    try {
        // Check if the user exists
        const userCheck = await pool.query('SELECT * FROM "Users" WHERE "UserID" = $1', [UserID]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng với UserID đã cho!' });
        }
        // Check if the phone number already exists for another user
        if (req.body.Std) {
            const phoneCheck = await pool.query(
                'SELECT * FROM "Users" WHERE "Std" = $1 AND "UserID" != $2',
                [req.body.Std, UserID]
            );
            if (phoneCheck.rows.length > 0) {
                return res.status(400).json({ message: 'Số điện thoại đã tồn tại!' });
            }
        }

        // Start constructing the update query
        let query = 'UPDATE "Users" SET ';
        const params = []; // Array to hold parameters
        let setClauses = []; // Array to hold SET clause strings

        // If there is an image, add it to the update
        if (Img) {
            setClauses.push('"Img" = $' + (params.length + 1)); // Use parameterized queries
            params.push(Img);
        }

        // Add other fields if they are provided
        const fields = ['Hoten', 'Ngaysinh', 'Noisinh', 'Chuyenganh', 'Sonam', 'Gioitinh', 'Std', 'Tendonvi', 'Nganh', 'MGV'];
        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                setClauses.push(`"${field}" = $${params.length + 1}`);
                params.push(req.body[field]);
            }
        });

        // Complete the query
        query += setClauses.join(', ') + ' WHERE "UserID" = $' + (params.length + 1);
        params.push(UserID); // Add UserID to the parameters
        // Execute the update query
        await pool.query(query, params);

        // Return success response
        res.status(200).json({ 
            status: 1, 
            message: 'Cập nhật thông tin người dùng thành công!',
            imageUrl: Img ? `C:/Users/nguye/Desktop/data/uploads/${path.basename(Img)}` : null // Adjust the path based on your app's needs
        });
    } catch (err) {
        console.error('Lỗi cập nhật thông tin người dùng:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    }
};
exports.deleteTeacher = async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN'); // Bắt đầu transaction
        
        const teacherId = req.params.UserID;

        // 1. Kiểm tra xem giáo viên có tồn tại không
        const teacherCheck = await client.query(
            'SELECT * FROM "Users" WHERE "UserID" = $1 AND "RoleID" = 2',
            [teacherId]
        );

        if (teacherCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                status: 0,
                message: 'Không tìm thấy giáo viên!' 
            });
        }

        // 2. Kiểm tra và xóa dữ liệu của giáo viên trong bảng Dulieu nếu có
        const dulieuCheck = await client.query(
            'SELECT COUNT(*) FROM "Dulieu" WHERE "UserID" = $1',
            [teacherId]
        );

        if (parseInt(dulieuCheck.rows[0].count) > 0) {
            await client.query(
                'DELETE FROM "Dulieu" WHERE "UserID" = $1',
                [teacherId]
            );
        }

        // 3. Xóa tài khoản giáo viên
        const deleteResult = await client.query(
            'DELETE FROM "Users" WHERE "UserID" = $1 AND "RoleID" = 2 RETURNING *',
            [teacherId]
        );

        await client.query('COMMIT');
        res.status(200).json({
            status: 1,
            message: 'Xóa giáo viên và dữ liệu thành công!'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Lỗi khi xóa giáo viên:', error);
        res.status(500).json({
            status: 0,
            message: 'Lỗi máy chủ',
            error: error.message
        });
    } finally {
        client.release();
    }
};