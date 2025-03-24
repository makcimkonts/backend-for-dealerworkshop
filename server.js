const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const app = express();
const port = process.env.PORT || 3000;
const path = require('path');
dotenv.config();

// Міддлваре для обробки JSON
app.use(express.json());

// Дозволити CORS
app.use(cors());

// Підключаємо статичні файли для Express
app.use(express.static(path.join(__dirname, 'public')));  // Вказуємо папку з вашими файлами (login.html, index.html, тощо)

// Підключаємо маршрути
const userRoutes = require('./routes/userRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const orderRoutes = require('./routes/orderRoutes');
const authRoutes = require('./routes/authRoutes');
app.use('/api/user', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

// Тестова маршрут для перевірки
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Перевірка наявних маршрутів
function printRoutes(app) {
    let routes = [];
    app._router.stack.forEach(function (middleware) {
        if (middleware.route) {
            // Якщо це маршрут
            routes.push(middleware.route.path);
        } else if (middleware.name === 'router') {
            // Якщо це внутрішній маршрутизатор Express
            middleware.handle.stack.forEach(function (route) {
                if (route.route) {
                    routes.push(route.route.path);
                }
            });
        }
    });
    console.log(routes); // Вивести всі маршрути
}

try {
    printRoutes(app);
} catch (error) {
    console.error('Помилка при отриманні маршрутів:', error);
}



// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущено на порту ${port}`);
});
