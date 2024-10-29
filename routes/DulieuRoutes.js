const express = require('express');
const router = express.Router();
const { 
    getDulieu, 
    addDulieu, 
    updateDulieu, 
    deleteDulieu,
    getDulieuCount,
    downloadFile,
    viewFile,
    getDulieuID
} = require('../controllers/DulieuController');
const { authMiddleware } = require('../middleware/authMiddleware');

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     DulieuResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: integer
 *           example: 1
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             ID:
 *               type: integer
 *             Tieude:
 *               type: string
 *             Files:
 *               type: string
 *             Nhomtacgia:
 *               type: string
 *             Tapchixuatban:
 *               type: string
 *             Thongtinmatapchi:
 *               type: string
 *             Namhoc:
 *               type: integer
 *             Ghichu:
 *               type: string
 *             UserID:
 *               type: integer
 *             ChuyenNganhID:
 *               type: integer
 */
/**
 * @swagger
 * /api/dulieu/addDulieu:
 *   post:
 *     summary: Thêm dữ liệu mới
 *     tags: [Dulieu]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - Tieude
 *               - Files
 *               - UserID
 *               - ChuyenNganhID
 *             properties:
 *               Tieude:
 *                 type: string
 *                 description: Tiêu đề của dữ liệu
 *               Files:
 *                 type: string
 *                 format: binary
 *                 description: File Word (.doc, .docx) hoặc PDF
 *               Nhomtacgia:
 *                 type: string
 *               Tapchiuatban:
 *                 type: string
 *               Thongtinmatpchi:
 *                 type: string
 *               Namhoc:
 *                 type: integer
 *               Ghichu:
 *                 type: string
 *               UserID:
 *                 type: integer
 *               ChuyenNganhID:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Thêm dữ liệu thành công
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
 *                   example: "Thêm dữ liệu thành công!"
 *                 data:
 *                   type: object
 *                   properties:
 *                     ID:
 *                       type: integer
 *                     Tieude:
 *                       type: string
 *                     Files:
 *                       type: string
 *                     Nhomtacgia:
 *                       type: string
 *                     Tapchiuatban:
 *                       type: string
 *                     Thongtinmatpchi:
 *                       type: string
 *                     Namhoc:
 *                       type: integer
 *                     Ghichu:
 *                       type: string
 *                     UserID:
 *                       type: integer
 *                     ChuyenNganhID:
 *                       type: integer
 *       400:
 *         description: Dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: "Vui lòng điền đầy đủ thông tin bắt buộc!"
 *       401:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: "Không có quyền truy cập!"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: "Lỗi khi thêm dữ liệu!"
 *                 error:
 *                   type: string
 */
router.post('/dulieu/addDulieu', authMiddleware, addDulieu);
/**
 * @swagger
 * /api/dulieu:
 *   get:
 *     summary: Retrieve all Dulieu entries
 *     tags: [Dulieu]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all Dulieu entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DulieuResponse'
 *       500:
 *         description: Server error
 */
router.get('/dulieu', authMiddleware, getDulieu);





/**
 * @swagger
 * /api/dulieu/count:
 *   get:
 *     summary: Get total count of Dulieu entries
 *     tags: [Dulieu]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
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
 *                 count:
 *                   type: integer
 */
router.get('/dulieu/count', authMiddleware, getDulieuCount);

/**
 * @swagger
 * /api/dulieu/download/{ID}:
 *   get:
 *     summary: Download file
 *     tags: [Dulieu]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File stream
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not found
 */
router.get('/dulieu/download/:ID', authMiddleware, downloadFile);

/**
 * @swagger
 * /api/dulieu/view/{ID}:
 *   get:
 *     summary: View file
 *     tags: [Dulieu]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/msword:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not found
 */
router.get('/dulieu/view/:ID', authMiddleware, viewFile);

/**
 * @swagger
 * /api/dulieu/getDulieuID/{UserID}:
 *   get:
 *     summary: Get Dulieu by UserID
 *     tags: [Dulieu]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: UserID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DulieuResponse'
 *       404:
 *         description: Not found
 */
router.get('/dulieu/getDulieuID/:UserID', authMiddleware, getDulieuID);
/**
 * @swagger
 * /api/dulieu/updateDulieu/{ID}:
 *   put:
 *     summary: Cập nhật dữ liệu
 *     tags: [Dulieu]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ID
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của dữ liệu cần cập nhật
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               Tieude:
 *                 type: string
 *                 description: Tiêu đề của dữ liệu
 *               Files:
 *                 type: string
 *                 format: binary
 *                 description: File Word (.doc, .docx) hoặc PDF
 *               Nhomtacgia:
 *                 type: string
 *               Tapchiuatban:
 *                 type: string
 *               Thongtinmatpchi:
 *                 type: string
 *               Namhoc:
 *                 type: integer
 *               Ghichu:
 *                 type: string
 *               UserID:
 *                 type: integer
 *               ChuyenNganhID:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Cập nhật thành công
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
 *                   example: "Cập nhật dữ liệu thành công!"
 *                 data:
 *                   type: object
 *                   properties:
 *                     ID:
 *                       type: integer
 *                     Tieude:
 *                       type: string
 *                     Files:
 *                       type: string
 *                     Nhomtacgia:
 *                       type: string
 *                     Tapchiuatban:
 *                       type: string
 *                     Thongtinmatpchi:
 *                       type: string
 *                     Namhoc:
 *                       type: integer
 *                     Ghichu:
 *                       type: string
 *                     UserID:
 *                       type: integer
 *                     ChuyenNganhID:
 *                       type: integer
 *       400:
 *         description: Dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *       404:
 *         description: Không tìm thấy dữ liệu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: "Không tìm thấy dữ liệu!"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.put('/dulieu/updateDulieu/:ID', authMiddleware, updateDulieu);

/**
 * @swagger
 * /api/dulieu/deleteDulieu/{ID}:
 *   delete:
 *     summary: Delete a Dulieu entry
 *     tags: [Dulieu]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully deleted
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
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
router.delete('/dulieu/deleteDulieu/:ID', authMiddleware, deleteDulieu);
module.exports = router;