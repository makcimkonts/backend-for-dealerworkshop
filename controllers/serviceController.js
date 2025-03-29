const db = require('../config/db');

// Додавання нового сервісу
const addService = async (req, res) => {
    const { service_name, description, price, vin_code } = req.body;

    if (!service_name || !price || !vin_code) {
        return res.status(400).json({ message: "Не всі обов'язкові поля заповнені!" });
    }

    try {
        const [result] = await db.execute(
            'INSERT INTO services (service_name, description, price, vin_code) VALUES (?, ?, ?, ?)',
            [service_name, description, price, vin_code]
        );

        res.status(201).json({ message: "Сервіс успішно додано!", serviceId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка при додаванні сервісу' });
    }
};

// Редагування сервісу
const updateService = async (req, res) => {
    const { id } = req.params;
    const { service_name, description, price, vin_code } = req.body;

    console.log("Request body:", req.body);
    console.log("Request params:", req.params);

    if (!id || !service_name || !description || price === undefined || !vin_code) {
        return res.status(400).json({ error: "Усі поля обов'язкові" });
    }

    try {
        const validServiceName = service_name ?? null;
        const validDescription = description ?? null;
        const validPrice = price ?? null;
        const validVinCode = vin_code ?? null;

        const [result] = await db.execute(
            'UPDATE services SET service_name = ?, description = ?, price = ?, vin_code = ? WHERE id = ?',
            [validServiceName, validDescription, validPrice, validVinCode, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Сервіс не знайдено' });
        }

        res.json({ message: "Сервіс успішно оновлено!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка при оновленні сервісу' });
    }
};


// Видалення сервісу
const deleteService = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.execute('DELETE FROM services WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Сервіс не знайдено' });
        }

        res.json({ message: "Сервіс успішно видалено!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка при видаленні сервісу' });
    }
};

// Отримати всі сервіси
const getAllServices = async (req, res) => {
    try {
        const [services] = await db.execute('SELECT * FROM services');
        res.json(services);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка при отриманні сервісів' });
    }
};

// Отримати конкретний сервіс за ID
const getServiceById = async (req, res) => {
    const { id } = req.params;

    try {
        const [service] = await db.execute('SELECT * FROM services WHERE id = ?', [id]);

        if (service.length === 0) {
            return res.status(404).json({ message: 'Сервіс не знайдено' });
        }

        // Підраховуємо загальну вартість без запчастин
        const totalCost = service[0].price;

        res.json({ ...service[0], totalCost });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка при отриманні сервісу' });
    }
};





const getAvailableServices = async (req, res) => {
    const { vin } = req.params;

    if (!vin) {
        return res.status(400).json({ message: 'VIN-код не вказаний.' });
    }

    try {
        const [services] = await db.execute(
            'SELECT * FROM services WHERE vin_code IS NULL OR vin_code = ?', 
            [vin]
        );

        res.json(services);
    } catch (error) {
        console.error('Помилка отримання доступних послуг:', error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
};


module.exports = {
    addService,
    updateService,
    deleteService,
    getAllServices,
    getServiceById,
    getAvailableServices
};
