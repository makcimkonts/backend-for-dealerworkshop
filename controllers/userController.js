const pool = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getProfile = async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, login, first_name, last_name, vin_code, role, balance FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!users.length) {
            return res.status(404).json({ message: 'Користувача не знайдено' });
        }

        res.json(users[0]);
    } catch (error) {
        res.status(500).json({ message: 'Помилка сервера' });
    }
};
exports.updateProfile = async (req, res) => {
    try {
        const { first_name, last_name, vin_code } = req.body;

        if (!first_name || !last_name || !vin_code) {
            return res.status(400).json({ message: 'Усі поля обов’язкові' });
        }

        await pool.query(
            'UPDATE users SET first_name = ?, last_name = ?, vin_code = ?, updated_at = NOW() WHERE id = ?',
            [first_name, last_name, vin_code, req.user.id]
        );

        res.json({ message: 'Профіль оновлено' });
    } catch (error) {
        res.status(500).json({ message: 'Помилка сервера' });
    }
};


exports.updatePassword = async (req, res) => {
    try {
        const { old_password, new_password } = req.body;

        if (!old_password || !new_password) {
            return res.status(400).json({ message: 'Введіть старий і новий пароль' });
        }

        const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (!users.length) {
            return res.status(404).json({ message: 'Користувача не знайдено' });
        }

        const isMatch = await bcrypt.compare(old_password, users[0].password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Старий пароль неправильний' });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hashedPassword, req.user.id]);

        res.json({ message: 'Пароль оновлено' });
    } catch (error) {
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

exports.getVin = async (req, res) => {
    try {
        // Отримуємо ID користувача з токена
        const userId = req.user.id;

        // Запит до бази даних для отримання VIN-коду
        const [result] = await pool.query('SELECT vin_code FROM users WHERE id = ?', [userId]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'Користувача не знайдено' });
        }

        // Повертаємо VIN-код користувача
        res.json({ vin_code: result[0].vin_code });
    } catch (error) {
        console.error('❌ Помилка при отриманні VIN-коду:', error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

// Отримати баланс користувача
// exports.getUserBalance = async (req, res) => {
//     try {
//         const userId = req.user.id;
//         const [rows] = await pool.execute('SELECT balance FROM users WHERE id = ?', [userId]);

//         if (rows.length === 0) {
//             return res.status(404).json({ message: 'Користувача не знайдено' });
//         }

//         res.json({ balance: rows[0].balance });
//     } catch (error) {
//         console.error('❌ Помилка при отриманні балансу:', error);
//         res.status(500).json({ message: 'Помилка сервера' });
//     }
// };

// Поповнення балансу
exports.topUpBalance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Некоректна сума поповнення' });
        }

        // Перевірка максимального поповнення (наприклад, 10000 грн)
        if (amount > 10000) {
            return res.status(400).json({ message: 'Максимальна сума поповнення - 10000 грн' });
        }

        // Оновлення балансу користувача
        await pool.execute('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, userId]);

        res.json({ message: `Баланс успішно поповнено на ${amount} грн` });
    } catch (error) {
        console.error('❌ Помилка при поповненні балансу:', error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};