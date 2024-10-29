const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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