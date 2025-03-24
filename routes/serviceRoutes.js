const express = require('express');
const router = express.Router();
const { authenticateToken, authenticateManager } = require('../middleware/authenticateToken');
const serviceController = require('../controllers/serviceController');

// Додавання нового сервісу
router.post('/', authenticateToken, authenticateManager, serviceController.addService);

// Редагування сервісу
router.put('/:id', authenticateToken, authenticateManager, serviceController.updateService);

// Видалення сервісу
router.delete('/:id', authenticateToken, authenticateManager, serviceController.deleteService);

// Отримати всі сервіси
router.get('/', authenticateToken, serviceController.getAllServices);

// Отримати сервіс за ID
router.get('/:id', authenticateToken, serviceController.getServiceById);
router.get('/available/:vin', serviceController.getAvailableServices);

module.exports = router;
