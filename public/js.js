const API_BASE_URL = 'http://localhost:3000/api'; // Замініть на вашу адресу сервера
let token = localStorage.getItem('token');
let selectedServices = []; // Ініціалізація для вибраних послуг
if (token) {
    fetch('http://localhost:3000/api/user/profile', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));
} else {
    console.log('No token found');
}

function showMessage(elementId, message, isSuccess) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = message;
    element.style.color = isSuccess ? 'green' : 'red';
}

// Перевірка авторизації при завантаженні сторінки
function checkAuth() {
    if (!token) {
        document.getElementById('authSection').classList.remove('hidden');
        document.getElementById('profileSection').classList.add('hidden');
    } else {
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('profileSection').classList.remove('hidden');
        fetchUserProfile();
    }
}

// Вхід
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const login = document.getElementById('loginLogin').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Помилка входу');
        localStorage.setItem('token', data.token);
        token = data.token;
        checkAuth();
    } catch (error) {
        showMessage('loginMessage', error.message, false);
    }
});
// реєстрація
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const login = document.getElementById('registerLogin').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const firstName = document.getElementById('registerFirstName').value;
    const lastName = document.getElementById('registerLastName').value;
    const vinCode = document.getElementById('registerVinCode').value;

    // Перевірка на збіг паролів
    if (password !== confirmPassword) {
        showMessage('registerMessage', 'Паролі не співпадають', false);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                login,
                password,
                first_name: firstName,
                last_name: lastName,
                vin_code: vinCode
            })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Помилка реєстрації');

        showMessage('registerMessage', 'Реєстрація успішна! Тепер увійдіть у систему.', true);
        
        // Можна додати автоматичний перехід на сторінку входу або очистити форму
        document.getElementById('registerForm').reset();
    } catch (error) {
        showMessage('registerMessage', error.message, false);
    }
});


// Функція для відображення повідомлення
// function showMessage(message) {
//     const messageElement = document.getElementById('message'); // чи інший спосіб знаходження елемента
//     if (messageElement) {
//       messageElement.textContent = message;
//     } else {
//       console.error('Елемент не знайдено');
//     }
//   }
  



// Вийти
document.getElementById('logoutButton')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    token = null;
    checkAuth();
});

// Отримати VIN-код користувача
async function fetchUserVinCode() {
    try {
        if (!token) throw new Error('Відсутній токен. Авторизуйтесь знову.');
        
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error('Не вдалося отримати VIN-код.');
        
        return data.vin_code;
    } catch (error) {
        showMessage('orderMessage', error.message, false);
        return null;
    }
}

// Додавання послуги до кошторису
async function addToSelectedServices(serviceId, serviceName, price, serviceVin) {
    const userVin = await fetchUserVinCode();
    if (!userVin) {
        showMessage('orderMessage', 'Помилка отримання VIN-коду користувача.', false);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/orders/validate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ serviceId, userVin }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Помилка перевірки VIN-коду');

        // Якщо сервіс підходить, додаємо його до списку
        selectedServices.push({ id: serviceId, name: serviceName, price: price });
        updateSelectedServicesList();
        showMessage('orderMessage', 'Сервіс успішно додано до кошторису.', true);
    } catch (error) {
        showMessage('orderMessage', error.message, false);
    }
}

// Оновлення списку вибраних послуг
function updateSelectedServicesList() {
    const selectedServicesList = document.getElementById('selectedServicesList');
    selectedServicesList.innerHTML = selectedServices.map(service => `
        <li>
            ${service.name} - ${service.price} грн 
            <button onclick="removeFromSelectedServices(${service.id})">Видалити</button>
        </li>
    `).join('');
}

// Видалення послуги з вибраних
function removeFromSelectedServices(serviceId) {
    selectedServices = selectedServices.filter(service => service.id !== serviceId);
    updateSelectedServicesList();
}




// Отримати профіль користувача
async function fetchUserProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
     
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Помилка отримання профілю');
        document.getElementById('userName').textContent = data.login;
        document.getElementById('userFirstName').textContent = data.first_name;
        document.getElementById('userLastName').textContent = data.last_name;
        document.getElementById('userVinCode').textContent = data.vin_code;
        document.getElementById('userRole').textContent = data.role;
        document.getElementById('userBalance').textContent = data.balance || '0.00';

        const userId = JSON.parse(atob(token.split('.')[1]))?.id;
        fetchOrders(userId);
        fetchServices();
    } catch (error) {
        showMessage('loginMessage', error.message, false);
    }
}




// Поповнення балансу
document.getElementById('topUpBalanceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = document.getElementById('topUpAmount').value;
    try {
        const response = await fetch(`${API_BASE_URL}/user/balance/top-up`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Помилка поповнення');
        showMessage('topUpBalanceMessage', `Баланс поповнено на ${amount} грн!`, true);
        fetchUserProfile();
    } catch (error) {
        showMessage('topUpBalanceMessage', error.message, false);
    }
});
// пароль
async function changePassword(oldPassword, newPassword) {
    try {
        if (!token) throw new Error('Відсутній токен. Авторизуйтесь знову.');
        
        const response = await fetch(`${API_BASE_URL}/user/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        showMessage('passwordMessage', 'Пароль успішно змінено!', true);
    } catch (error) {
        showMessage('passwordMessage', error.message, false);
    }
}


 // Створити замовлення з обраних сервісів
 document.getElementById('createOrderButton').addEventListener('click', async (event) => {
    event.preventDefault(); // Запобігає оновленню сторінки

    try {
        if (!token) throw new Error('Відсутній токен. Авторизуйтесь знову.');

        const userVin = await fetchUserVinCode();
        if (!userVin) throw new Error('VIN-код не знайдено');

        if (selectedServices.length === 0) throw new Error('Виберіть хоча б один сервіс для кошторису.');

        const serviceIds = selectedServices.map(service => service.id);
        const totalPrice = selectedServices.reduce((sum, service) => sum + (service.price || 0), 0);

        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ services: serviceIds, total_price: totalPrice, vin: userVin }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Помилка створення кошторису');

        showMessage('orderMessage', 'Кошторис успішно створено!', true);
        fetchOrders(JSON.parse(atob(token.split('.')[1])).id || data.user_id);
    } catch (error) {
        showMessage('orderMessage', error.message, false);
    }
});




// Зміна профілю
async function updateProfileInfo(firstName, lastName, vinCode) {
    try {
        if (!token) throw new Error('Відсутній токен. Авторизуйтесь знову.');

        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ first_name: firstName, last_name: lastName, vin_code: vinCode }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        showMessage('profileMessage', 'Профіль оновлено!', true);
        fetchUserProfile();
    } catch (error) {
        showMessage('profileMessage', error.message, false);
    }
}

document.getElementById('updateProfileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Use the correct IDs
    const firstName = document.getElementById('updateFirstName').value;
    const lastName = document.getElementById('updateLastName').value;
    const vinCode = document.getElementById('updateVinCode').value;
    
    updateProfileInfo(firstName, lastName, vinCode);
});

async function updatePasswordInfo(oldPassword, newPassword) {
    try {
        if (!token) throw new Error('Відсутній токен. Авторизуйтесь знову.');

        const response = await fetch(`${API_BASE_URL}/user/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        // Показуємо повідомлення про успішну зміну пароля
        showMessage('profileMessage', 'Пароль успішно змінено!', true);

        // Сховуємо профіль і показуємо форму входу
        document.getElementById('profileSection').classList.add('hidden');
        document.getElementById('authSection').classList.remove('hidden');

        // Додатково можемо очистити поля форми входу
        document.getElementById('loginLogin').value = '';
        document.getElementById('loginPassword').value = '';

    } catch (error) {
        showMessage('profileMessage', error.message, false);
    }
}

document.getElementById('updatePasswordForm').addEventListener('submit', (e) => {
    e.preventDefault();

    // Отримуємо значення з полів форми для зміни паролю
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    // Перевірка на наявність значень
    if (!oldPassword || !newPassword) {
        showMessage('profileMessage', 'Будь ласка, заповніть всі поля.', false);
        return;
    }

    updatePasswordInfo(oldPassword, newPassword);
});




// Отримати всі сервіси
// Отримати всі сервіси
async function fetchServices() {
    try {
        const response = await fetch(`${API_BASE_URL}/services`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Помилка отримання сервісів');

        const servicesTableBody = document.querySelector('#servicesTable tbody');
        servicesTableBody.innerHTML = data.map(service => `
            <tr>
                <td>${service.id}</td>
                <td>${service.service_name}</td>
                <td>${service.description}</td>
                <td>${service.price || 'Невідомо'} грн</td>
                <td>${service.vin_code}</td>
                <td>
                    <button onclick="handleAddToQuote(${service.id}, '${service.service_name}', ${service.price}, '${service.vin_code}')">Додати до кошторису</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showMessage('serviceSection', error.message, false);
    }
}


async function handleAddToQuote(serviceId, serviceName, servicePrice, serviceVinCode) {
    const userVin = await fetchUserVinCode();
    if (!userVin) {
        showMessage('orderMessage', 'Помилка отримання VIN-коду користувача.', false);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/orders/validate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ serviceId, userVin }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Помилка перевірки VIN-коду');

        selectedServices.push({ id: serviceId, name: serviceName, price: servicePrice });
        updateSelectedServicesList();
        showMessage('orderMessage', 'Сервіс успішно додано до кошторису.', true);
    } catch (error) {
        showMessage('orderMessage', error.message, false);
    }
}
// Отримання історії замовлень
async function fetchOrders(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Не вдалося отримати замовлення');

        const ordersTableBody = document.querySelector('#ordersTable tbody');
        ordersTableBody.innerHTML = data.map(order => `
            <tr>
                <td>${order.id}</td>
                <td>${order.services.map(s => s.name).join(', ')}</td>
                <td>${order.status}</td>
                <td>${order.total_price || 'Невідомо'} грн</td>
                <td>
                    ${order.status === 'Pending' ? `
                        <button onclick="cancelOrder(${order.id})">Скасувати</button>
                    ` : ''}
                    ${order.status === 'Completed' ? `
                        <button onclick="payForOrder(${order.id})">Оплатити</button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showMessage('orderMessage', error.message, false);
    }
}


// Функція для скасування замовлення
async function cancelOrder(orderId) {
    if (!orderId) {
        console.error('Не вказано ID замовлення');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Помилка скасування замовлення');
        showMessage('orderMessage', 'Замовлення успішно скасовано.', true);
        fetchOrders(data.userId); // Оновлюємо список замовлень
    } catch (error) {
        showMessage('orderMessage', error.message, false);
    }
}

// Функція для оплати замовлення
async function payForOrder(orderId) {
    if (!orderId) {
        console.error('Не вказано ID замовлення');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/pay`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json', // Важливо додати Content-Type
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Помилка оплати замовлення');
        showMessage('orderMessage', 'Замовлення успішно оплачено.', true);
        fetchOrders(data.userId); // Оновлюємо список замовлень
    } catch (error) {
        showMessage('orderMessage', error.message, false);
    }
}

// checkAuth();
document.addEventListener("DOMContentLoaded", checkAuth);
