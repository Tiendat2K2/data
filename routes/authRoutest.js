const express = require('express');
const router = express.Router();
const { register, login ,getAllUsers,sendVerificationEmail ,refreshToken,resetTeacherPassword,deleteTeacher,updateTeacher,getTeachers,getUserCount,updateUser,getUserById,updatePassword} = require('../controllers/authController');
const multer = require('multer');
const path = require('path');

// Cấu hình multer để xử lý upload file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/')); // Adjust the path as needed
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: API xác thực người dùng
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - Email
 *         - Username
 *         - Password
 *       properties:
 *         Email:
 *           type: string
 *           description: Email của người dùng
 *           example: user@gmail.com
 *         Username:
 *           type: string
 *           description: Tên đăng nhập
 *           example: user123
 *         Password:
 *           type: string
 *           description: Mật khẩu
 *           example: password123
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: Đăng ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 1
 *                 message:
 *                   type: string
 *                   example: Đăng ký thành công!
 *                 roleID:
 *                   type: integer
 *                   example: 2
 *       400:
 *         description: Lỗi dữ liệu đầu vào
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Email đã được đăng ký!
 *       500:
 *         description: Lỗi server
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Username
 *               - Password
 *             properties:
 *               Username:
 *                 type: string
 *                 example: user123
 *               Password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 1
 *                 message:
 *                   type: string
 *                   example: Đăng nhập thành công!
 *                 access_token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 refresh_token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Sai thông tin đăng nhập
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sai tên đăng nhập hoặc mật khẩu!
 *       500:
 *         description: Lỗi server
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
router.post('/forgot-password', sendVerificationEmail);
/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Làm mới access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token đã được làm mới
 *       401:
 *         description: Refresh token không hợp lệ
 */
router.post('/refresh-token', refreshToken);
/**
 * @swagger
 * /api/auth/resetTeacherPassword/{UserID}:
 *   post:
 *     summary: Đặt lại mật khẩu giáo viên về mặc định
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: UserID
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của giáo viên
 *     responses:
 *       200:
 *         description: Đặt lại mật khẩu thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 1
 *                 message:
 *                   type: string
 *                   example: Đặt lại mật khẩu giáo viên thành công!
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: integer
 *                     defaultPassword:
 *                       type: string
 *       400:
 *         description: UserID không hợp lệ
 *       404:
 *         description: Không tìm thấy giáo viên
 *       500:
 *         description: Lỗi server
 */
router.post('/resetTeacherPassword/:UserID', resetTeacherPassword);
/**
 * @swagger
 * /api/auth/getAllUsers:
 *   get:
 *     summary: Lấy danh sách tất cả người dùng
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: [] # Ensure authentication is required
 *     responses:
 *       200:
 *         description: Danh sách người dùng
 *       404:
 *         description: Không tìm thấy người dùng nào
 *       500:
 *         description: Lỗi máy chủ
 */

router.get('/getAllUsers', getAllUsers);
/**
 * @swagger
 * /api/auth/getTeachers:
 *   get:
 *     summary: Retrieve a list of teachers
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: A list of teachers.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   description: Status code of the response.
 *                   example: 1
 *                 message:
 *                   type: string
 *                   description: Message of the response.
 *                   example: Danh sách giáo viên
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       UserID:
 *                         type: integer
 *                         description: The ID of the teacher.
 *                         example: 1
 *                       Email:
 *                         type: string
 *                         description: The email of the teacher.
 *                         example: "teacher@example.com"
 *                       Username:
 *                         type: string
 *                         description: The username of the teacher.
 *                         example: "teacher1"
 *                       Std:
 *                         type: string
 *                         description: Standard/class of the teacher.
 *                         example: "10th"
 *       404:
 *         description: No teachers found.
 *       500:
 *         description: Server error.
 */

router.get('/getTeachers', getTeachers);
/**
 * @swagger
 * /api/auth/user-count:
 *   get:
 *     summary: Retrieve the total number of users
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: The total number of users.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   description: Status code of the response.
 *                   example: 1
 *                 message:
 *                   type: string
 *                   description: Message of the response.
 *                   example: Số lượng người dùng
 *                 userCount:
 *                   type: integer
 *                   description: The total number of users.
 *                   example: 100
 *       404:
 *         description: No users found.
 *       500:
 *         description: Server error.
 */
router.get('/user-count', getUserCount);
/**
 * @swagger
 * /api/auth/getUserById/{id}:
 *   get:
 *     summary: Get user information by ID
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 1
 *                 message:
 *                   type: string
 *                   example: Thông tin người dùng
 *                 data:
 *                   type: object
 *                   properties:
 *                     Hoten:
 *                       type: string
 *                     Ngaysinh:
 *                       type: string
 *                       format: date
 *                     Noisinh:
 *                       type: string
 *                     Chuyenganh:
 *                       type: string
 *                     Sonam:
 *                       type: integer
 *                     Gioitinh:
 *                       type: string
 *                     Std:
 *                       type: string
 *                     Tendonvi:
 *                       type: string
 *                     Nganh:
 *                       type: string
 *                     Img:
 *                       type: string
 *                     MGV:
 *                       type: string
 *       400:
 *         description: Invalid UserID
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/getUserById/:id', getUserById);
/**
 * @swagger
 * /api/auth/updateTeacher:
 *   put:
 *     summary: Cập nhật thông tin giáo viên
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - UserID
 *             properties:
 *               UserID:
 *                 type: integer
 *               Email:
 *                 type: string
 *               Username:
 *                 type: string
 *               Std:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 1
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     UserID:
 *                       type: integer
 *                     Email:
 *                       type: string
 *                     Username:
 *                       type: string
 *                     Std:
 *                       type: string
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy giáo viên
 *       500:
 *         description: Lỗi server
 */
router.put('/updateTeacher', updateTeacher);
/**
 * @swagger
 * /api/auth/updateUser:
 *   put:
 *     summary: Update user information
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - UserID
 *             properties:
 *               UserID:
 *                 type: integer
 *                 description: ID of the user
 *                 example: 0
 *               Img:
 *                 type: string
 *                 format: binary
 *                 description: Image file of the user
 *               Hoten:
 *                 type: string
 *                 description: Full name of the user
 *                 example: "Nguyen Van A"
 *               Ngaysinh:
 *                 type: string
 *                 format: date
 *                 description: Date of birth
 *                 example: "1990-01-01"
 *               Noisinh:
 *                 type: string
 *                 description: Place of birth
 *                 example: "Hanoi"
 *               Chuyenganh:
 *                 type: string
 *                 description: Major
 *                 example: "Computer Science"
 *               Sonam:
 *                 type: integer
 *                 description: Number of years
 *                 example: 5
 *               Gioitinh:
 *                 type: string
 *                 description: Gender
 *                 example: "Male"
 *               Std:
 *                 type: string
 *                 description: Phone number
 *                 example: "0123456789"
 *               Tendonvi:
 *                 type: string
 *                 description: Unit name
 *                 example: "IT Department"
 *               Nganh:
 *                 type: string
 *                 description: Field
 *                 example: "Information Technology"
 *               MGV:
 *                 type: string
 *                 description: Teacher code
 *                 example: "2100535"
 *     responses:
 *       200:
 *         description: User information updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 1
 *                 message:
 *                   type: string
 *                   example: Cập nhật thông tin người dùng thành công!
 *                 imageUrl:
 *                   type: string
 *                   example: /uploads/image.jpg
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/updateUser', upload.single('Img'), updateUser);
/**
 * @swagger
 * /api/auth/updatePassword:
 *   put:
 *     summary: Update user password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - UserID
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               UserID:
 *                 type: integer
 *                 description: ID of the user
 *                 example: 11
 *               oldPassword:
 *                 type: string
 *                 description: The current password of the user
 *                 example: "oldPassword123"
 *               newPassword:
 *                 type: string
 *                 description: The new password for the user
 *                 example: "newPassword123"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 1
 *                 message:
 *                   type: string
 *                   example: Cập nhật mật khẩu thành công!
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/updatePassword', updatePassword);
/**
 * @swagger
 * /api/auth/deleteTeacher/{UserID}:
 *   delete:
 *     summary: Xóa tài khoản giáo viên
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: UserID
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của giáo viên cần xóa
 *     responses:
 *       200:
 *         description: Xóa giáo viên thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 1
 *                 message:
 *                   type: string
 *                   example: Xóa giáo viên thành công!
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedUserId:
 *                       type: integer
 *       400:
 *         description: UserID không hợp lệ
 *       404:
 *         description: Không tìm thấy giáo viên
 *       500:
 *         description: Lỗi server
 */

router.delete('/deleteTeacher/:UserID', deleteTeacher);
module.exports = router;