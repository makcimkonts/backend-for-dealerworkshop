const express = require('express');
const {
    getProfile,
    updateProfile,
    updatePassword,
    topUpBalance,
    getVin,
    getUsers,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/userController'); // Правильний імпорт без userController
const db = require('../config/db');
const { authenticateToken, authenticateManager} = require('../middleware/authenticateToken');

const router = express.Router();

router.get('/profile', authenticateToken,  getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/password', authenticateToken, updatePassword);

// router.get('/balance', authenticateToken, getUserBalance); // Оновлено
router.post('/balance/top-up', authenticateToken, topUpBalance); // Оновлено
router.get('/vin', authenticateToken, getVin);

// Отримати всіх користувачів
router.get('/', authenticateToken, authenticateManager, getUsers);

// Створити нового користувача
router.post('/', authenticateToken, authenticateManager, createUser);

// Оновити користувача
router.put('/:id', authenticateToken, authenticateManager, updateUser);

// Видалити користувача
router.delete('/:id', authenticateToken, authenticateManager, deleteUser);



module.exports = router;
