const express = require('express');
const router = express.Router();
const { register ,login,sendVerificationEmail} = require('../controllers/authController');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng ký người dùng mới
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Email:
 *                 type: string
 *                 format: email
 *               Username:
 *                 type: string
 *               Password:
 *                 type: string
 *             required:
 *               - Email
 *               - Username
 *               - Password
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *       400:
 *         description: Email hoặc username đã tồn tại
 *       500:
 *         description: Lỗi máy chủ
 */
router.post('/register', register);
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng nhập người dùng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Username:
 *                 type: string
 *               Password:
 *                 type: string
 *             required:
 *               - Username
 *               - Password
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *       401:
 *         description: Thông tin xác thực không hợp lệ
 *       404:
 *         description: Người dùng không tồn tại
 *       500:
 *         description: Lỗi máy chủ
 */
router.post('/login', login);
/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Gửi liên kết đặt lại mật khẩu đến email người dùng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Email
 *             properties:
 *               Email:
 *                 type: string
 *                 format: email
 *                 description: Địa chỉ email của người dùng
 *     responses:
 *       200:
 *         description: Liên kết đặt lại mật khẩu đã được gửi tới email của bạn
 *       400:
 *         description: Yêu cầu không hợp lệ, thiếu email
 *       404:
 *         description: Không tìm thấy người dùng với email đã cho
 *       500:
 *         description: Lỗi máy chủ
 */
router.post('/forgot-password', sendVerificationEmail); // Thay đổi route thành forgot-password
module.exports = router;
