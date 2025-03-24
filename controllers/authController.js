const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { login, password, first_name, last_name, vin_code } = req.body;

        // Перевірка наявності користувача
        const [userExists] = await pool.query(
            'SELECT id FROM users WHERE login = ?',
            [login]
        );
        if (userExists.length) {
            return res.status(400).json({ message: 'Користувач вже існує' });
        }

        // Хешування паролю
        const hashedPassword = await bcrypt.hash(password, 10);

        // Додавання користувача
        await pool.query(
            'INSERT INTO users (login, password, first_name, last_name, vin_code) VALUES (?, ?, ?, ?, ?)',
            [login, hashedPassword, first_name, last_name, vin_code]
        );

        res.status(201).json({ message: 'Реєстрація успішна' });
    } catch (error) {
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.login = async (req, res) => {
    try {
        const { login, password } = req.body;
        console.log('Login request:', login, password); // Додай логування на сервері для перевірки

        // Отримуємо користувача
        const [users] = await pool.query(
            'SELECT * FROM users WHERE login = ?',
            [login]
        );
        if (!users.length) {
            return res.status(400).json({ message: 'Невірний логін або пароль' });
        }
        const user = users[0];

        // Перевіряємо пароль
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Невірний логін або пароль' });
        }

        // Генеруємо токен
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token, role: user.role });
    } catch (error) {
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
