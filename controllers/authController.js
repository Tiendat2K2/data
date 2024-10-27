const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL, // Đảm bảo biến môi trường DATABASE_URL được cấu hình
    ssl: {
        rejectUnauthorized: false
    }
});
exports.register = async (req, res) => {
    const { Email, Username, Password } = req.body;

    // Kiểm tra xem các trường có rỗng không
    if (!Email || !Username || !Password) {
        return res.status(400).json({ message: 'Vui lòng nhập tất cả các trường!' });
    }

    // Kiểm tra định dạng email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(Email)) {
        return res.status(400).json({ message: 'Địa chỉ email không hợp lệ! Vui lòng kiểm tra định dạng email của bạn.' });
    }

    let client; // Declare client here to be accessible in finally
    try {
        client = await pool.connect();
        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(Password, 10);
        // Kiểm tra xem email đã tồn tại chưa
        const emailQuery = 'SELECT * FROM "Users" WHERE "Email" = $1';
        const emailResult = await client.query(emailQuery, [Email]);
        if (emailResult.rows.length > 0) {
            return res.status(400).json({ message: 'Email đã được đăng ký!' });
        }
        // Kiểm tra xem username đã tồn tại chưa
        const usernameQuery = 'SELECT * FROM "Users" WHERE "Username" = $1';
        const usernameResult = await client.query(usernameQuery, [Username]);
        if (usernameResult.rows.length > 0) {
            return res.status(400).json({ message: 'Username đã được đăng ký!' });
        }
        // Kiểm tra số lượng người dùng để xác định RoleID
        const countQuery = 'SELECT COUNT(*) FROM "Users"';
        const countResult = await client.query(countQuery);
        const userCount = parseInt(countResult.rows[0].count, 10);
        const roleID = userCount === 0 ? 1 : 2;
        // Thực hiện thêm người dùng mới vào cơ sở dữ liệu
        const insertQuery = 'INSERT INTO "Users" ("Username", "Email", "Password", "RoleID") VALUES ($1, $2, $3, $4)';
        await client.query(insertQuery, [Username, Email, hashedPassword, roleID]);
        res.status(200).json({ status: 1, message: 'Đăng ký thành công!', roleID: roleID });
    } catch (err) {
        console.error('Đăng ký lỗi:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    } finally {
        // Giải phóng kết nối về pool
        if (client) {
            client.release();
        }
    }
}
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
        process.env.access_token,
        { expiresIn: '300d' }
      );
      // Tạo refresh_token
      const refresh_token = jwt.sign(
        { id: user.UserID, roleId: user.RoleID },
        process.env.refresh_token,
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
  function generateRandomPassword(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return password;
}
exports.sendVerificationEmail = async (req, res) => {
    const { Email } = req.body;

    if (!Email) {
        return res.status(400).json({ message: 'Vui lòng cung cấp địa chỉ email!' });
    }

    try {
        // Connect to the database
        const client = await pool.connect();

        try {
            // Check if email exists
            const userResult = await client.query(
                'SELECT UserID FROM Users WHERE Email = $1',
                [Email]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({ message: 'Không tìm thấy tài khoản với email đã cho!' });
            }

            // Generate a new password
            const newPassword = generateRandomPassword(10);
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);

            // Update the new password in the database
            await client.query(
                'UPDATE Users SET Password = $1 WHERE UserID = $2',
                [hashedNewPassword, userResult.rows[0].userid]
            );

            // Configure email sender
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

            // Send email
            await transporter.sendMail(mailOptions);

            res.status(200).json({ status: 1, message: 'Mật khẩu mới đã được gửi tới email của bạn!' });
        } finally {
            client.release(); // Release the client back to the pool
        }
    } catch (err) {
        console.error('Lỗi khi đặt lại mật khẩu:', err);
        res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    }
};
