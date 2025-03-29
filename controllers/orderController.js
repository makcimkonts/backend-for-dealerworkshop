const db = require('../config/db');

// Створення нового замовлення
const createOrder = async (req, res) => {
    try {
        const { services, total_price, vin } = req.body;
        const user_id = req.user?.id;

        console.log('📝 Отримані дані:', { user_id, services, total_price, vin });

        if (!services || !Array.isArray(services) || services.length === 0) {
            console.warn('⚠️ Невірний формат сервісів:', services);
            return res.status(400).json({ message: 'Невірний формат сервісів' });
        }
        if (!vin || typeof vin !== 'string') {
            console.warn('⚠️ Некоректний VIN-код:', vin);
            return res.status(400).json({ message: 'Некоректний VIN-код' });
        }
        if (!user_id) {
            console.warn('⚠️ Користувач не авторизований');
            return res.status(401).json({ message: 'Користувач не авторизований' });
        }

        console.log('🔍 Отримання послуг для VIN:', vin);

        // Отримання ID та цін сервісів, доступних для цього VIN
        const [servicesForVin] = await db.execute('SELECT id, price FROM services WHERE vin_code = ?', [vin]);
        console.log('✅ Послуги, доступні для VIN:', servicesForVin);

        const availableServicesMap = new Map(servicesForVin.map(service => [service.id, parseFloat(service.price)])); // конвертуємо ціну в число

        // Розділення вибраних сервісів на ті, що підходять, і ті, що ні
        console.log('⚡ Отримані ID від клієнта:', services);
        const validServices = services.filter(serviceId => availableServicesMap.has(serviceId));
        const invalidServices = services.filter(serviceId => !availableServicesMap.has(serviceId));

        console.log('🎯 Валідні сервіси:', validServices);
        console.log('❌ Невалідні сервіси:', invalidServices);

        // Якщо жодна послуга не підходить, не створюємо замовлення
        if (validServices.length === 0) {
            console.warn('🚫 Жоден сервіс не підходить для цього VIN.');
            return res.status(400).json({
                message: 'Жоден з вибраних сервісів не доступний для цього VIN-коду',
                invalidServices
            });
        }

        // Перерахунок загальної ціни
        const recalculatedTotalPrice = validServices.reduce((sum, serviceId) => sum + availableServicesMap.get(serviceId), 0);
        console.log('💰 Перерахована загальна ціна:', recalculatedTotalPrice);

        // Створення замовлення
        console.log('🛒 Створення замовлення для користувача:', user_id);
        const [orderResult] = await db.execute(
            'INSERT INTO orders (user_id, total_price, status) VALUES (?, ?, ?)',
            [user_id, recalculatedTotalPrice.toFixed(2), 'Pending']
        );
        const orderId = orderResult.insertId;
        console.log('✅ Замовлення створено, ID:', orderId);

        // Додавання сервісів у замовлення
        for (const serviceId of validServices) {
            console.log(`➕ Додаємо сервіс ${serviceId} у замовлення ${orderId}`);
            await db.execute(
                'INSERT INTO order_services (order_id, service_id) VALUES (?, ?)',
                [orderId, serviceId]
            );
        }

        // Формування повідомлення про частково доступні послуги
        const responseMessage = invalidServices.length > 0
            ? `Замовлення створено, але наступні послуги недоступні для вашого VIN: ${invalidServices.join(', ')}` 
            : 'Замовлення створено успішно';

        console.log('📩 Відповідь клієнту:', {
            message: responseMessage,
            orderId,
            validServices,
            invalidServices,
            recalculatedTotalPrice
        });

        res.status(201).json({
            message: responseMessage,
            orderId,
            validServices,
            invalidServices,
            recalculatedTotalPrice
        });

    } catch (error) {
        console.error('❌ Помилка створення замовлення:', error);
        res.status(500).json({ message: 'Помилка сервера', error: error.message });
    }
};




// Отримання історії замовлень для користувача
const getOrdersForUser = async (req, res) => {
    const userId = req.user.id;  // Отримуємо userId з токена
    console.log(`User ID from token: ${userId}`);

    try {
        const [orders] = await db.execute(
            `SELECT o.id AS order_id, o.user_id, o.status, o.created_at, o.updated_at,
                    s.id AS service_id, s.service_name, s.price, s.vin_code
             FROM orders o
             LEFT JOIN order_services os ON o.id = os.order_id
             LEFT JOIN services s ON os.service_id = s.id
             WHERE o.user_id = ?`,
            [userId]  // Фільтруємо замовлення за user_id
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Замовлення не знайдено' });
        }

        const ordersWithDetails = [];
        let currentOrder = null;

        orders.forEach(order => {
            // Якщо це нове замовлення (починається новий order)
            if (!currentOrder || currentOrder.id !== order.order_id) {
                if (currentOrder) {
                    ordersWithDetails.push(currentOrder);
                }
                currentOrder = {
                    id: order.order_id,
                    user_id: order.user_id,
                    total_price: 0,
                    status: order.status,
                    created_at: order.created_at,
                    updated_at: order.updated_at,
                    services: [],
                };
            }

            // Перевірка, щоб уникнути NaN в загальній вартості
            const servicePrice = parseFloat(order.price);
            if (!isNaN(servicePrice)) {
                // Додаємо послугу до поточного замовлення
                currentOrder.services.push({
                    id: order.service_id,
                    name: order.service_name,
                    price: servicePrice,
                    vin_code: order.vin_code,
                });

                // Додаємо вартість послуги до загальної вартості
                currentOrder.total_price += servicePrice;
            }
        });

        // Додаємо останнє замовлення в масив
        if (currentOrder) {
            ordersWithDetails.push(currentOrder);
        }

        res.json(ordersWithDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка при отриманні замовлень' });
    }
};



// Оновлення статусу замовлення
const updateOrderStatus = async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    try {
        const validStatuses = ['Pending', 'Confirmed', 'Completed', 'Paid'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Невірний статус замовлення' });
        }

        const [result] = await db.execute(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, orderId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Замовлення не знайдено' });
        }

        res.json({ message: 'Статус замовлення успішно оновлено' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка при оновленні статусу замовлення' });
    }
};

// Оплата замовлення
const payForOrder = async (req, res) => {
    const userId = req.user.id;  // Беремо ID користувача з токену
    const { orderId } = req.params;  // ID замовлення

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Отримуємо замовлення
        const [order] = await connection.execute(
            'SELECT id, user_id, total_price, status FROM orders WHERE id = ? AND user_id = ?',
            [orderId, userId]
        );

        if (order.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Замовлення не знайдено' });
        }

        // Дозволяємо оплату для статусів 'Pending' та 'Completed'
        if (order[0].status !== 'Pending' && order[0].status !== 'Completed') {
            await connection.rollback();
            return res.status(400).json({ message: 'Замовлення не може бути оплачено' });
        }

        const orderTotalPrice = parseFloat(order[0].total_price);

        // Отримуємо баланс користувача
        const [user] = await connection.execute('SELECT balance FROM users WHERE id = ?', [userId]);
        if (user.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Користувач не знайдений' });
        }

        let userBalance = parseFloat(user[0].balance || 0);

        // Перевірка, чи є достатньо коштів для оплати
        if (userBalance < orderTotalPrice) {
            await connection.rollback();
            return res.status(400).json({ message: 'Недостатньо коштів для оплати' });
        }

        // Оновлюємо статус замовлення на "Paid"
        await connection.execute('UPDATE orders SET status = "Paid" WHERE id = ?', [orderId]);
        // Зменшуємо баланс користувача на суму замовлення
        await connection.execute('UPDATE users SET balance = balance - ? WHERE id = ?', [orderTotalPrice, userId]);

        await connection.commit();  // Підтверджуємо транзакцію

        // Повертаємо успішну відповідь
        return res.json({ 
            message: 'Оплата замовлення успішна', 
            newBalance: userBalance - orderTotalPrice  // Показуємо новий баланс користувача
        });
    } catch (error) {
        await connection.rollback();  // Якщо сталася помилка, відкатуємо транзакцію
        console.error('❌ Помилка при оплаті замовлення:', error);
        return res.status(500).json({ message: 'Помилка сервера при оплаті', error: error.message });
    } finally {
        connection.release();  // Завжди звільняємо підключення до БД
    }
};



// Скидання статусу замовлення
const resetOrderStatus = async (req, res) => {
    const { orderId } = req.params;

    try {
        const [result] = await db.execute(
            'UPDATE orders SET status = "Pending" WHERE id = ?',
            [orderId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Замовлення не знайдено' });
        }

        res.json({ message: 'Статус замовлення оновлено на "Pending"' });
    } catch (error) {
        console.error('❌ Помилка при оновленні статусу замовлення:', error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
// Скасувати замовлення
const cancelOrder = async (req, res) => {
    
    const orderId = req.params.id;
    console.log('Order ID on server:', orderId);
    console.log('Order ID on server:', orderId); // Логування ID на сервері
    // Логування для перевірки отримання orderId
    console.log('Order ID:', orderId);

    // Перевірка наявності orderId
    if (!orderId) {
        return res.status(400).json({ message: 'ID замовлення не вказано' });
    }

    try {
        // Спочатку перевіримо, чи існує замовлення з таким ID
        const [order] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);

        // Логування для перевірки замовлення
        console.log('Order found:', order);

        if (order.length === 0) {
            return res.status(404).json({ message: 'Замовлення не знайдено' });
        }

        // Перевірка статусу замовлення
        if (order[0].status !== 'Pending') {
            return res.status(400).json({ message: 'Замовлення не можна скасувати, тому що його статус не "Pending"' });
        }

        // Видаляємо записи з таблиці order_services
        await db.execute('DELETE FROM order_services WHERE order_id = ?', [orderId]);

        // Потім видаляємо замовлення з таблиці orders
        const [result] = await db.execute('DELETE FROM orders WHERE id = ? AND status = "Pending"', [orderId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Замовлення не знайдено або вже обробляється' });
        }

        res.status(200).json({ message: 'Замовлення скасовано успішно' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка при скасуванні замовлення' });
    }
};




// Завершити замовлення
const completeOrder = async (req, res) => {
    const { orderId } = req.params;

    try {
        const [order] = await db.execute(
            'SELECT status FROM orders WHERE id = ?',
            [orderId]
        );

        if (order.length === 0) {
            return res.status(404).json({ message: 'Замовлення не знайдено' });
        }

        const currentStatus = order[0].status;

        if (currentStatus !== 'Pending' && currentStatus !== 'Confirmed') {
            return res.status(400).json({ message: 'Неможливо завершити замовлення в поточному статусі' });
        }

        await db.execute(
            'UPDATE orders SET status = "Completed" WHERE id = ?',
            [orderId]
        );

        res.json({ message: 'Замовлення завершено' });
    } catch (error) {
        console.error('❌ Помилка при завершенні замовлення:', error);
        res.status(500).json({ message: 'Помилка сервера при завершенні замовлення' });
    }
};

const validateServiceByVin = async (req, res) => {
    try {
        const { serviceId, userVin } = req.body;

        if (!serviceId || !userVin) {
            return res.status(400).json({ message: 'Не вказані всі необхідні дані.' });
        }

        // Перевіряємо, чи існує сервіс та чи підходить VIN-код
        const [service] = await db.query(
            'SELECT vin_code FROM services WHERE id = ? LIMIT 1', 
            [serviceId]
        );

        if (!service || service.length === 0) {
            return res.status(404).json({ message: 'Сервіс не знайдено.' });
        }

        if (service[0].vin_code && service[0].vin_code !== userVin) {
            return res.status(400).json({ message: 'Цей сервіс несумісний з вашим авто.' });
        }

        res.json({ message: 'Сервіс можна додати.' });
    } catch (error) {
        console.error('Помилка перевірки VIN-коду:', error);
        res.status(500).json({ message: 'Внутрішня помилка сервера.' });
    }
};


// Функція для отримання історії замовлень користувача
const getOrderHistory = async (req, res) => {
    const userId = Number(req.params.userId);
    
    try {
        // 1. Отримуємо основну інформацію про замовлення
        const [orders] = await db.execute(`
            SELECT o.id, o.total_price, o.status, o.created_at, o.updated_at
            FROM orders o
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        `, [userId]);

        if (!orders.length) {
            return res.status(404).json({ message: 'Замовлення не знайдено' });
        }

        // 2. Отримуємо послуги для кожного замовлення
        const ordersWithServices = await Promise.all(orders.map(async (order) => {
            const [services] = await db.execute(`
                SELECT s.id, s.service_name, s.price
                FROM order_services os
                JOIN services s ON os.service_id = s.id
                WHERE os.order_id = ?
            `, [order.id]);

            return {
                ...order,
                services: services || [],
                service: services.map(s => s.service_name).join(', '), // Для сумісності
                price: order.total_price // Явно вказуємо ціну
            };
        }));

        // 3. Отримуємо інформацію про користувача
        const [user] = await db.execute(
            'SELECT first_name, last_name, vin_code FROM users WHERE id = ?',
            [userId]
        );

        res.json({
            user_name: user.length ? `${user[0].first_name} ${user[0].last_name}` : 'Невідомий користувач',
            user_vin: user.length ? user[0].vin_code : 'Невідомий VIN',
            orders: ordersWithServices
        });

    } catch (error) {
        console.error('Помилка:', error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};




const OrderList = async (req, res) => {
    try {
        const [orders] = await db.query(`
          SELECT o.id, o.user_id, o.total_price, o.status, o.created_at, 
       GROUP_CONCAT(s.service_name SEPARATOR ', ') AS services
FROM orders o
LEFT JOIN order_services os ON o.id = os.order_id
LEFT JOIN services s ON os.service_id = s.id
GROUP BY o.id
ORDER BY o.created_at DESC;

        `);

        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


const confirmOrder = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            'UPDATE orders SET status = "confirmed" WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Замовлення не знайдено' });
        }

        res.json({ message: 'Замовлення підтверджено' });
    } catch (error) {
        console.error('Помилка підтвердження замовлення:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
};

module.exports = {
    createOrder,
    getOrdersForUser,
    updateOrderStatus,
    payForOrder,
    resetOrderStatus,
    cancelOrder,
    completeOrder,
    validateServiceByVin, // Ensure this is included
    getOrderHistory,
    OrderList,
    confirmOrder
};
