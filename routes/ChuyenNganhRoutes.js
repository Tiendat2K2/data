const express = require('express');
const router = express.Router();
const { getChuyenNganh, getChuyenNganhCount, addChuyenNganh, updateChuyenNganh, deleteChuyenNganh } = require('../controllers/ChuyenNganhController'); // Import all necessary functions
const { authMiddleware } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/addChuyenNganh:
 *   post:
 *     summary: Add a new Chuyen Nganh
 *     tags: [ChuyenNganh]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               TenChuyenNganh:
 *                 type: string
 *                 description: The name of the Chuyen Nganh
 *               UserID:
 *                 type: integer
 *                 description: The ID of the user associated with the Chuyen Nganh
 *     responses:
 *       201:
 *         description: Chuyen Nganh created successfully
 *       500:
 *         description: Internal server error
 */
router.post('/addChuyenNganh', authMiddleware, addChuyenNganh);

/**
 * @swagger
 * /api/chuyennganh:
 *   get:
 *     summary: Retrieve all Chuyen Nganh
 *     tags: [ChuyenNganh]
 *     responses:
 *       200:
 *         description: A list of Chuyen Nganh
 *         content:
 *         
 */
router.get('/chuyennganh', authMiddleware, getChuyenNganh);

/**
 * @swagger
 * /api/chuyennganh/count:
 *   get:
 *     summary: Get the count of Chuyên Ngành
 *     tags: [ChuyenNganh]
 *     responses:
 *       200:
 *         description: Successful response with the count of Chuyên Ngành
 *         content:

 */
router.get('/chuyennganh/count', authMiddleware, getChuyenNganhCount);
/**
 * @swagger
 * /api/chuyennganh/updateChuyenNganh:
 *   put:
 *     summary: Update an existing Chuyen Nganh
 *     tags: [ChuyenNganh]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               IDChuyenNganh:
 *                 type: integer
 *                 example: 0
 *               TenChuyenNganh:
 *                 type: string
 *                 example: "string"
 *               UserID:
 *                 type: integer
 *                 example: 0
 *     responses:
 *       200:
 *         description: Chuyen Nganh updated successfully
 *       500:
 *         description: Internal server error
 */
router.put('/chuyennganh/updateChuyenNganh', authMiddleware, updateChuyenNganh);
/**
 * @swagger
 * /api/chuyennganh/deleteChuyenNganh/{IDChuyenNganh}:
 *   delete:
 *     summary: Delete a Chuyen Nganh
 *     tags: [ChuyenNganh]
 *     parameters:
 *       - in: path
 *         name: IDChuyenNganh
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the Chuyen Nganh to delete
 *         example: 0
 *     responses:
 *       200:
 *         description: Chuyen Nganh deleted successfully
 *       404:
 *         description: Chuyen Nganh not found
 *       500:
 *         description: Internal server error
 */
router.delete('/chuyennganh/deleteChuyenNganh/:IDChuyenNganh', authMiddleware, deleteChuyenNganh);
module.exports = router; // Ensure the router is exported
