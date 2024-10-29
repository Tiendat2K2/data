const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();
// Cấu hình multer để xử lý upload file

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
  
      // Tạo access_token với roleId và UserID
      const access_token = jwt.sign(
        { id: user.UserID, roleId: user.RoleID },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '300d' }
      );
  
      // Tạo refresh_token
      const refresh_token = jwt.sign(
        { id: user.UserID, roleId: user.RoleID },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '365h' }
      );
  
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
exports.getAllUsers = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT "UserID", "Hoten", "Ngaysinh", "Noisinh", "Chuyenganh", "Sonam", "Gioitinh", "Std", "Tendonvi", "Nganh", "Img", "MGV" FROM "Users" WHERE "RoleID" = $1',
            [2] // Parameterized query to avoid SQL injection
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng nào!' });
        }

        res.status(200).json({
            status: 1, // Return status code
            message: 'Danh sách người dùng', // Return a message
            data: result.rows // Return the fetched users
        });
    } catch (err) {
        console.error('Lỗi lấy danh sách người dùng:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    }
};
exports.sendVerificationEmail = async (req, res) => {
    const { Email } = req.body;
    let client;

    if (!Email) {
        return res.status(400).json({ message: 'Vui lòng cung cấp địa chỉ email!' });
    }

    try {
        client = await pool.connect();

        // Kiểm tra email tồn tại
        const userQuery = 'SELECT "UserID", "Email" FROM "Users" WHERE "Email" = $1';
        const userResult = await client.query(userQuery, [Email]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ 
                message: 'Không tìm thấy tài khoản với email đã cho!' 
            });
        }

        // Tạo mật khẩu mới
        const newPassword = generateRandomPassword(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Cập nhật mật khẩu mới trong database
        await client.query(
            'UPDATE "Users" SET "Password" = $1 WHERE "Email" = $2',
            [hashedNewPassword, Email]
        );

        // Cấu hình nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Cấu hình email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: Email,
            subject: 'Mật khẩu mới của bạn',
            text: `Mật khẩu mới của bạn là: ${newPassword}`,
            html: `
                <h2>Mật khẩu mới của bạn</h2>
                <p>Mật khẩu mới của bạn là: <strong>${newPassword}</strong></p>
                <p>Vui lòng đăng nhập và đổi mật khẩu ngay sau khi nhận được email này.</p>
            `
        };

        // Gửi email
        await transporter.sendMail(mailOptions);

        res.status(200).json({
            status: 1,
            message: 'Mật khẩu mới đã được gửi tới email của bạn!'
        });

    } catch (err) {
        console.error('Lỗi khi đặt lại mật khẩu:', err);
        res.status(500).json({ 
            message: 'Lỗi máy chủ', 
            error: err.message 
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};
exports.refreshToken = async (req, res) => {
    const { refresh_token } = req.body;
    let client;

    if (!refresh_token) {
        return res.status(400).json({ message: 'Cần có refresh token' });
    }

    try {
        // Xác minh refresh token
        const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET);
        
        client = await pool.connect();
        
        // Kiểm tra user có tồn tại trong database
        const userQuery = 'SELECT "UserID", "RoleID" FROM "Users" WHERE "UserID" = $1';
        const userResult = await client.query(userQuery, [decoded.id]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'User không tồn tại' });
        }

        const user = userResult.rows[0];

        // Tạo access token mới
        const access_token = jwt.sign(
            { 
                id: user.UserID, 
                roleId: user.RoleID 
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1d' }
        );

        // Tạo refresh token mới
        const new_refresh_token = jwt.sign(
            { 
                id: user.UserID, 
                roleId: user.RoleID 
            },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        // Lưu refresh token mới vào database (tùy chọn)
        await client.query(
            'UPDATE "Users" SET "RefreshToken" = $1 WHERE "UserID" = $2',
            [new_refresh_token, user.UserID]
        );

        res.json({
            status: 1,
            message: 'Làm mới token thành công',
            access_token,
            refresh_token: new_refresh_token,
            
        });

    } catch (err) {
        console.error('Lỗi làm mới token:', err);
        res.status(401).json({ 
            message: 'Refresh token không hợp lệ hoặc đã hết hạn',
            error: err.message 
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};
exports.resetTeacherPassword = async (req, res) => {
    const { UserID } = req.params;
    let client;

    if (!UserID) {
        return res.status(400).json({ 
            status: 0,
            message: 'Vui lòng cung cấp UserID!' 
        });
    }

    try {
        client = await pool.connect();

        // Kiểm tra xem giáo viên có tồn tại không
        const userCheckQuery = 'SELECT * FROM "Users" WHERE "UserID" = $1 AND "RoleID" = 2';
        const userCheck = await client.query(userCheckQuery, [UserID]);

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ 
                status: 0,
                message: 'Không tìm thấy giáo viên với UserID đã cho!' 
            });
        }

        // Mật khẩu mặc định
        const defaultPassword = '1111';

        // Mã hóa mật khẩu mặc định
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        // Cập nhật mật khẩu mới
        const updateQuery = 'UPDATE "Users" SET "Password" = $1 WHERE "UserID" = $2 AND "RoleID" = 2';
        await client.query(updateQuery, [hashedPassword, UserID]);

        res.status(200).json({ 
            status: 1, 
            message: 'Đặt lại mật khẩu giáo viên thành công!',
            data: {
                userId: UserID,
                defaultPassword: defaultPassword
            }
        });

    } catch (err) {
        console.error('Lỗi đặt lại mật khẩu giáo viên:', err);
        res.status(500).json({ 
            status: 0,
            message: 'Lỗi máy chủ', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};
exports.deleteTeacher = async (req, res) => {
    const { UserID } = req.params;
    let client;

    if (!UserID) {
        return res.status(400).json({
            status: 0,
            message: 'Vui lòng cung cấp UserID!'
        });
    }

    try {
        client = await pool.connect();

        // Start transaction
        await client.query('BEGIN');

        // Check if teacher exists
        const userCheckQuery = 'SELECT * FROM "Users" WHERE "UserID" = $1 AND "RoleID" = 2';
        const userCheck = await client.query(userCheckQuery, [UserID]);

        if (userCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                status: 0,
                message: 'Không tìm thấy giáo viên với UserID đã cho!'
            });
        }

        // Delete associated data from "Dulieu" table first
        const deleteDulieuQuery = 'DELETE FROM "Dulieu" WHERE "UserID" = $1';
        await client.query(deleteDulieuQuery, [UserID]);

        // Delete teacher from "Users" table
        const deleteQuery = 'DELETE FROM "Users" WHERE "UserID" = $1 AND "RoleID" = 2';
        await client.query(deleteQuery, [UserID]);

        // Commit transaction
        await client.query('COMMIT');

        res.status(200).json({
            status: 1,
            message: 'Xóa giáo viên thành công!',
            data: {
                deletedUserId: UserID
            }
        });

    } catch (err) {
        // Rollback in case of error
        if (client) {
            await client.query('ROLLBACK');
        }

        console.error('Lỗi xóa giáo viên:', err);
        res.status(500).json({
            status: 0,
            message: 'Lỗi máy chủ',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};
exports.updateTeacher = async (req, res) => {
    let { UserID, Email, Username, Std } = req.body;
    let client;
    
    if (!UserID) {
        return res.status(400).json({ 
            status: 0, 
            message: 'Vui lòng cung cấp UserID!' 
        });
    }

    // Loại bỏ khoảng trắng thừa
    if (Email) Email = Email.trim();
    if (Username) Username = Username.trim();
    if (Std) Std = Std.trim();

    // Validate email format
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (Email && !gmailRegex.test(Email)) {
        return res.status(400).json({ 
            status: 0, 
            message: 'Vui lòng nhập đúng định dạng email Gmail!' 
        });
    }

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Kiểm tra xem giáo viên có tồn tại không
        const userCheckQuery = 'SELECT * FROM "Users" WHERE "UserID" = $1 AND "RoleID" = 2';
        const userCheck = await client.query(userCheckQuery, [UserID]);

        if (userCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                status: 0, 
                message: 'Không tìm thấy giáo viên với UserID đã cho!' 
            });
        }

        // Kiểm tra Email
        if (Email) {
            const emailCheckQuery = 'SELECT * FROM "Users" WHERE "Email" = $1 AND "UserID" != $2';
            const emailCheck = await client.query(emailCheckQuery, [Email, UserID]);

            if (emailCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    status: 0, 
                    message: 'Email đã tồn tại!' 
                });
            }
        }

        // Kiểm tra Username
        if (Username) {
            const usernameCheckQuery = 'SELECT * FROM "Users" WHERE "Username" = $1 AND "UserID" != $2';
            const usernameCheck = await client.query(usernameCheckQuery, [Username, UserID]);

            if (usernameCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    status: 0, 
                    message: 'Username đã tồn tại!' 
                });
            }
        }

        // Kiểm tra Std
        if (Std) {
            const stdCheckQuery = 'SELECT * FROM "Users" WHERE "Std" = $1 AND "UserID" != $2';
            const stdCheck = await client.query(stdCheckQuery, [Std, UserID]);

            if (stdCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    status: 0, 
                    message: 'Số điện thoại đã tồn tại!' 
                });
            }
        }

        // Xây dựng câu query update động
        let updateFields = [];
        let queryParams = [UserID];
        let paramCount = 2; // Bắt đầu từ $2 vì $1 là UserID

        if (Email) {
            updateFields.push(`"Email" = $${paramCount}`);
            queryParams.push(Email);
            paramCount++;
        }
        if (Username) {
            updateFields.push(`"Username" = $${paramCount}`);
            queryParams.push(Username);
            paramCount++;
        }
        if (Std) {
            updateFields.push(`"Std" = $${paramCount}`);
            queryParams.push(Std);
            paramCount++;
        }

        if (updateFields.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                status: 0, 
                message: 'Không có thông tin nào được cập nhật!' 
            });
        }

        const updateQuery = `
            UPDATE "Users" 
            SET ${updateFields.join(', ')} 
            WHERE "UserID" = $1 AND "RoleID" = 2 
            RETURNING "UserID", "Email", "Username", "Std"
        `;

        const updateResult = await client.query(updateQuery, queryParams);

        await client.query('COMMIT');

        res.status(200).json({ 
            status: 1, 
            message: 'Cập nhật thông tin giáo viên thành công!',
            data: updateResult.rows[0]
        });

    } catch (err) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('Lỗi cập nhật thông tin giáo viên:', err);
        res.status(500).json({ 
            status: 0, 
            message: 'Lỗi máy chủ', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};
exports.getTeachers = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                "UserID", 
                "Email", 
                "Username",
                "Std"
            FROM "Users"
            WHERE "RoleID" = 2
        `);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy giáo viên nào!' });
        }

        res.status(200).json({
            status: 1,
            message: 'Danh sách giáo viên',
            data: result.rows
        });
    } catch (err) {
        console.error('Lỗi lấy danh sách giáo viên:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    }
};
exports.getUserCount = async (req, res) => {
    let client;
    try {
        client = await pool.connect();

        const result = await client.query('SELECT COUNT(*) AS "UserCount" FROM "Users"');

        // Check if the result contains data
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
        }

        // Return the user count
        res.status(200).json({
            status: 1,
            message: 'Số lượng người dùng',
            userCount: result.rows[0].UserCount // Access the UserCount from the result
        });
    } catch (err) {
        console.error('Lỗi lấy số lượng người dùng:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};
exports.updateUser = async (req, res) => {
    const { UserID, Sonam } = req.body;
    let Img = null;

    if (req.file) {
        Img = req.file.path.replace(/\\/g, '/');
    }

    // Parse UserID and Sonam to integers
    const parsedUserID = parseInt(UserID, 10);
    const parsedSonam = Sonam !== undefined ? parseInt(Sonam, 10) : undefined;

    if (isNaN(parsedUserID)) {
        return res.status(400).json({ message: 'UserID phải là một số nguyên hợp lệ!' });
    }

    if (Sonam !== undefined && isNaN(parsedSonam)) {
        return res.status(400).json({ message: 'Sonam phải là một số nguyên hợp lệ!' });
    }

    let client;
    try {
        client = await pool.connect();

        // Check if the user exists
        const userCheck = await client.query('SELECT * FROM "Users" WHERE "UserID" = $1', [parsedUserID]);

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng với UserID đã cho!' });
        }

        // Check if the phone number already exists for another user
        if (req.body.Std) {
            const phoneCheck = await client.query(
                'SELECT * FROM "Users" WHERE "Std" = $1 AND "UserID" != $2',
                [req.body.Std, parsedUserID]
            );

            if (phoneCheck.rows.length > 0) {
                return res.status(400).json({ message: 'Số điện thoại đã tồn tại!' });
            }
        }

        let query = 'UPDATE "Users" SET ';
        const queryParams = [];
        let paramCount = 1;

        if (Img) {
            query += `"Img" = $${paramCount}`;
            queryParams.push(Img);
            paramCount++;
        }

        // Add other fields if they are provided
        const fields = ['Hoten', 'Ngaysinh', 'Noisinh', 'Chuyenganh', 'Gioitinh', 'Std', 'Tendonvi', 'Nganh', 'MGV'];
        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                if (queryParams.length > 0) query += ', ';
                query += `"${field}" = $${paramCount}`;
                queryParams.push(req.body[field]);
                paramCount++;
            }
        });

        if (parsedSonam !== undefined) {
            if (queryParams.length > 0) query += ', ';
            query += `"Sonam" = $${paramCount}`;
            queryParams.push(parsedSonam);
            paramCount++;
        }

        query += ` WHERE "UserID" = $${paramCount}`;
        queryParams.push(parsedUserID);

        await client.query(query, queryParams);

        res.status(200).json({ 
            status: 1, 
            message: 'Cập nhật thông tin người dùng thành công!',
            imageUrl: Img ? `/uploads/${path.basename(Img)}` : null
        });
    } catch (err) {
        console.error('Lỗi cập nhật thông tin người dùng:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};
exports.getUserById = async (req, res) => {
    const userId = parseInt(req.params.id, 10); // Parse UserID to an integer

    if (isNaN(userId)) {
        return res.status(400).json({ message: 'UserID phải là một số nguyên hợp lệ!' });
    }

    let client;
    try {
        client = await pool.connect();

        // SQL query to get user information by ID
        const result = await client.query(`
            SELECT 
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
                "UserID" = $1
        `, [userId]); // Use parameterized query to prevent SQL injection

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
        }

        res.status(200).json({
            status: 1,
            message: 'Thông tin người dùng',
            data: result.rows[0] // Return the fetched user
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
exports.updatePassword = async (req, res) => {
    const { UserID, oldPassword, newPassword } = req.body;

    if (!UserID || !oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Vui lòng nhập tất cả các trường!' });
    }

    const parsedUserID = parseInt(UserID, 10);
    if (isNaN(parsedUserID)) {
        return res.status(400).json({ message: 'UserID phải là một số nguyên hợp lệ!' });
    }

    let client;
    try {
        client = await pool.connect();

        const user = await client.query('SELECT "Password" FROM "Users" WHERE "UserID" = $1', [parsedUserID]);

        if (user.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
        }

        const validPassword = await bcrypt.compare(oldPassword, user.rows[0].Password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Mật khẩu cũ không chính xác!' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await client.query('UPDATE "Users" SET "Password" = $1 WHERE "UserID" = $2', [hashedNewPassword, parsedUserID]);

        res.status(200).json({ status: 1, message: 'Cập nhật mật khẩu thành công!' });
    } catch (err) {
        console.error('Lỗi cập nhật mật khẩu:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};exports.updatePassword = async (req, res) => {
    const { UserID, oldPassword, newPassword } = req.body;

    if (!UserID || !oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Vui lòng nhập tất cả các trường!' });
    }

    const parsedUserID = parseInt(UserID, 10);
    if (isNaN(parsedUserID)) {
        return res.status(400).json({ message: 'UserID phải là một số nguyên hợp lệ!' });
    }

    let client;
    try {
        client = await pool.connect();

        const user = await client.query('SELECT "Password" FROM "Users" WHERE "UserID" = $1', [parsedUserID]);

        if (user.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
        }

        const validPassword = await bcrypt.compare(oldPassword, user.rows[0].Password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Mật khẩu cũ không chính xác!' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await client.query('UPDATE "Users" SET "Password" = $1 WHERE "UserID" = $2', [hashedNewPassword, parsedUserID]);

        res.status(200).json({ status: 1, message: 'Cập nhật mật khẩu thành công!' });
    } catch (err) {
        console.error('Lỗi cập nhật mật khẩu:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};