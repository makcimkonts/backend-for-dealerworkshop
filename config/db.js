const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const db = pool.promise();

// Перевірка підключення
(async () => {
  try {
    const connection = await db.getConnection();
    console.log("✅ MySQL підключено");
    connection.release(); // Відпускаємо з'єднання в пул
  } catch (err) {
    console.error("❌ Помилка підключення до MySQL:", err);
    process.exit(1);
  }
})();

module.exports = db;
