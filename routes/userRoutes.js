const express = require('express');
const {
    getProfile,
    updateProfile,
    updatePassword,
    topUpBalance,
    getVin
} = require('../controllers/userController'); // Правильний імпорт без userController
const db = require('../config/db');
const { authenticateToken } = require('../middleware/authenticateToken');

const router = express.Router();

router.get('/profile', authenticateToken,  getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/password', authenticateToken, updatePassword);

// router.get('/balance', authenticateToken, getUserBalance); // Оновлено
router.post('/balance/top-up', authenticateToken, topUpBalance); // Оновлено


router.get('/vin', authenticateToken, getVin);


module.exports = router;
