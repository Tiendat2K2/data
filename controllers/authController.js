const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();
function generateRandomPassword(length) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}
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