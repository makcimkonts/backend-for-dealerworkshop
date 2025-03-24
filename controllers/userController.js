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




// Отримання всіх користувачів
exports.getUsers = async (req, res) => {
    try {
        const [users] = await pool.execute('SELECT id, login, first_name, last_name, vin_code, role, balance FROM users'); // Запит для отримання всіх користувачів
        res.status(200).json(users); // Відправка результату у вигляді JSON
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error retrieving users' });
    }
};

// Створення нового користувача
exports.createUser = async (req, res) => {
    const { login, password, first_name, last_name, vin_code, role } = req.body;

    // Перевірка на обов'язкові поля
    if (!login || !password || !first_name || !last_name || !vin_code || !role) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    try {
        // Хешування пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        // Запит для додавання нового користувача з хешованим паролем
        const result = await pool.execute(
            'INSERT INTO users (login, password, first_name, last_name, vin_code, role, balance) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [login, hashedPassword, first_name, last_name, vin_code, role, 0.00] // balance = 0.00 за замовчуванням
        );

        res.status(201).json({ message: 'User created successfully', userId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating user' });
    }
};

// Оновлення даних користувача
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { login, first_name, last_name, vin_code, role, balance } = req.body;

    // Створюємо об'єкт для оновлення
    const updatedFields = [];
    const updatedValues = [];

    if (login !== undefined) {
        updatedFields.push('login');
        updatedValues.push(login);
    }
    if (first_name !== undefined) {
        updatedFields.push('first_name');
        updatedValues.push(first_name);
    }
    if (last_name !== undefined) {
        updatedFields.push('last_name');
        updatedValues.push(last_name);
    }
    if (vin_code !== undefined) {
        updatedFields.push('vin_code');
        updatedValues.push(vin_code);
    }
    if (role !== undefined) {
        updatedFields.push('role');
        updatedValues.push(role);
    }
    if (balance !== undefined) {
        updatedFields.push('balance');
        updatedValues.push(balance);
    }

    // Якщо не передано жодного поля, то повертаємо помилку
    if (updatedFields.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
    }

    // Додаємо ID користувача в масив значень для WHERE умови
    updatedValues.push(id);

    // Формуємо запит для оновлення
    const query = `UPDATE users SET ${updatedFields.map(field => `${field} = ?`).join(', ')} WHERE id = ?`;

    try {
        // Виконуємо запит
        const [result] = await pool.execute(query, updatedValues);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating user' });
    }
};




// Видалення користувача
exports.deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting user' });
    }
};

// Перевірка пароля при логіні
exports.checkPassword = async (req, res) => {
    const { login, password } = req.body;

    try {
        const [user] = await pool.execute('SELECT * FROM users WHERE login = ?', [login]);

        if (user.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Перевірка пароля
        const isMatch = await bcrypt.compare(password, user[0].password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        res.status(200).json({ message: 'Login successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error during login' });
    }
};
