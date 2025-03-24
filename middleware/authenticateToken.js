// middleware/authenticateToken.js
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'Не авторизовано' });
    }
    console.log('Token received:', token); // Додай лог для токена
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Невірний токен' });
        }
        req.user = user;
        console.log('Decoded token:', user); // Додай лог для декодованого токена
        next();
    });
};

const authenticateManager = (req, res, next) => {
    if (req.user.role !== 'manager' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Немає доступу' });
    }
    next();
};

module.exports = { authenticateToken, authenticateManager };
