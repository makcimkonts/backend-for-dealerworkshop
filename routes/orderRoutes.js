const express = require('express');
const router = express.Router();
const { authenticateToken, authenticateManager } = require('../middleware/authenticateToken');

const orderController = require('../controllers/orderController');
// Створення нового замовлення
router.post('/', authenticateToken, orderController.createOrder);

// Отримання історії замовлень для користувача
router.get('/:userId', authenticateToken, orderController.getOrdersForUser);

// Оновлення статусу замовлення
router.put('/status/:orderId', authenticateToken, authenticateManager, orderController.updateOrderStatus);

// Оплата замовлення
router.post('/:orderId/pay', authenticateToken, orderController.payForOrder);

// Скидання статусу замовлення на "Pending"
router.post('/status/reset/:orderId', authenticateToken, authenticateManager, orderController.resetOrderStatus);
// Скасування замовлення

// router.post('/orders/:id/cancel', authenticateToken, authenticateManager, orderController.cancelOrder);
router.post('/:id/cancel', (req, res, next) => {
    console.log('Received request to cancel order:', req.params.id); // Логування ID замовлення
    next();
}, authenticateToken, authenticateManager, orderController.cancelOrder);

router.post('/validate', orderController.validateServiceByVin);

// Завершення замовлення
router.post('/:orderId/complete', authenticateToken, authenticateManager, orderController.completeOrder);


router.get('/order-history/:id', authenticateToken,authenticateManager, orderController.getOrderHistory);


module.exports = router;
