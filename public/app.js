// Define the API URL and JWT token
const API_BASE_URL = 'http://localhost:3000/api/';
let token = localStorage.getItem('token');
console.log(token);  // Check if the token is retrieved correctly

// Error display function
function showErrorToUser(message) {
    // Create or find error display element
    let errorDiv = document.getElementById('errorDisplay');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'errorDisplay';
        errorDiv.style = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px;
            background: #ff4444;
            color: white;
            border-radius: 5px;
            z-index: 1000;
        `;
        document.body.appendChild(errorDiv);
    }
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    getUsers();
    getOrders();
});

// User Management Functions (unchanged)
async function getUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}user/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        const usersTable = document.getElementById('usersTable').getElementsByTagName('tbody')[0];
        usersTable.innerHTML = '';

        data.forEach(user => {
            const row = usersTable.insertRow();
            row.setAttribute('data-id', user.id);
            row.innerHTML = `
                <td class="editable" data-field="login">${user.login}</td>
                <td class="editable" data-field="first_name">${user.first_name}</td>
                <td class="editable" data-field="last_name">${user.last_name}</td>
                <td class="editable" data-field="vin_code">${user.vin_code}</td>
                <td class="editable" data-field="role">${user.role}</td>
                <td class="editable" data-field="balance">${user.balance}</td>
                <td><button onclick="deleteUser(${user.id})">Delete</button></td>
            `;
        });

        const editableCells = document.querySelectorAll('.editable');
        editableCells.forEach(cell => {
            cell.addEventListener('dblclick', function() {
                editCell(cell);
            });
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        showErrorToUser('Помилка завантаження користувачів');
    }
}



// Функція для редагування клітинки
// Функція для редагування клітинки
// Функція для редагування клітинки
function editCell(cell) {
    const originalValue = cell.textContent;
    const field = cell.getAttribute('data-field');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalValue;

    cell.innerHTML = ''; // Очистити клітинку
    cell.appendChild(input);

    // При натисканні Enter або втраті фокусу зберігаємо нове значення
    input.addEventListener('blur', () => saveCell(cell, input, field, originalValue));
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            saveCell(cell, input, field, originalValue);
        }
    });
}

// Функція для збереження відредагованого значення
async function saveCell(cell, input, field, originalValue) {
    const newValue = input.value;

    if (newValue !== originalValue) { // Якщо значення змінилося
        const userId = cell.closest('tr').getAttribute('data-id'); // Отримуємо ID користувача

        const row = cell.closest('tr');
        const updatedUserData = {};

        // Оновлюємо тільки те поле, яке було змінено
        updatedUserData[field] = newValue;

        // Додаємо всі інші поля без змін, щоб зберегти їх в базі
        row.querySelectorAll('[data-field]').forEach((cell) => {
            const key = cell.getAttribute('data-field');
            if (!updatedUserData[key]) {
                updatedUserData[key] = cell.textContent;
            }
        });

        try {
            const response = await fetch(`${API_BASE_URL}user/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedUserData)
            });

            if (response.ok) {
                alert('User updated successfully');
                getUsers(); // Оновлюємо список користувачів
            } else {
                alert('Failed to update user');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    } else {
        // Якщо значення не змінилося, просто повертаємо початкове значення
        cell.textContent = originalValue;
    }
}


// ... (keep all your existing user management functions unchanged)

// Fixed Order Management Functions
async function getOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}orders/`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to fetch orders');
        }

        const orders = await response.json();
        console.log('Orders data:', orders);

        // Get all users to match with orders
        const usersResponse = await fetch(`${API_BASE_URL}user/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await usersResponse.json();

        // Process orders with user information
        const processedOrders = orders.map(order => {
            const user = users.find(u => u.id === order.user_id) || {};
            const serviceInfo = order.services || 'Невідома послуга';
            const vinCode = order.vin_code || user.vin_code || 'Невідомий VIN';
            
            return {
                ...order,
                user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Невідомий користувач',
                user_vin: user.vin_code || 'Невідомий VIN',
                service: serviceInfo,
                vin_code: vinCode,
                price: parseFloat(order.total_price) || 0,
                status: order.status || 'Pending'
            };
        });

        renderOrders(processedOrders);
        renderPendingOrders(processedOrders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        showErrorToUser('Не вдалося завантажити замовлення');
    }
}


// Render functions (unchanged)
function renderOrders(orders) {
    const ordersTable = document.getElementById('ordersTable');
    if (!ordersTable) return;
    
    const tbody = ordersTable.getElementsByTagName('tbody')[0];
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!orders || !Array.isArray(orders)) {
        tbody.innerHTML = '<tr><td colspan="7">Немає даних про замовлення</td></tr>';
        return;
    }
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">Немає замовлень</td></tr>';
        return;
    }
    
    orders.forEach(order => {
        const row = tbody.insertRow();
        row.setAttribute('data-id', order.id);
        row.innerHTML = `
            <td>${order.user_name}</td>
            <td>${order.user_vin}</td>
            <td>${order.service}</td>
            <td class="status-cell" onclick="changeStatus(${order.id}, '${order.status}')">
                ${translateStatus(order.status)}
            </td>
            <td>${order.price.toFixed(2)} грн</td>
            <td>
                ${order.status === 'Pending' ? 
                    `<button onclick="cancelOrder(${order.id})">Скасувати</button>` : 
                    ''}
                <button onclick="getOrdersByUser(${order.user_id})">Замовлення цього користувача</button>
            </td>
        `;
    });
}

function renderPendingOrders(orders) {
    const pendingTable = document.getElementById('pendingOrdersTable');
    if (!pendingTable) {
        console.error('Pending orders table not found');
        return;
    }
    
    const tbody = pendingTable.getElementsByTagName('tbody')[0];
    if (!tbody) {
        console.error('Table body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    const pendingOrders = orders.filter(order => 
        order.status && ['Pending', 'Confirmed'].includes(order.status)
    );
    
    if (pendingOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Немає незавершених замовлень</td></tr>';
        return;
    }
    
    pendingOrders.forEach(order => {
        const row = tbody.insertRow();
        row.setAttribute('data-id', order.id);
        row.innerHTML = `
            <td>${order.service}</td>
            <td>${order.vin_code}</td>
            <td class="status-cell" onclick="changeStatus(${order.id}, '${order.status}')">
                ${translateStatus(order.status)}
            </td>
            <td>${order.price.toFixed(2)} грн</td>
            <td>
                <button onclick="cancelOrder(${order.id})">Скасувати</button>
                ${order.status === 'Pending' ? 
                    `<button onclick="confirmOrder(${order.id})">Підтвердити</button>` : 
                    `<button onclick="completeOrder(${order.id})">Завершити</button>`}
            </td>
        `;
    });
}


async function confirmOrder(orderId) {
    if (!confirm('Ви впевнені, що хочете підтвердити це замовлення?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}orders/${orderId}/confirm`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Не вдалося підтвердити замовлення');
        }

        alert('Замовлення підтверджено');
        getOrders(); // Оновлюємо список замовлень після підтвердження
    } catch (error) {
        console.error('Помилка підтвердження замовлення:', error);
        showErrorToUser('Не вдалося підтвердити замовлення');
    }
}


// Status translation (unchanged)
function translateStatus(status) {
    const statusMap = {
        'Pending': 'Очікує',
        'Confirmed': 'Підтверджено',
        'Completed': 'Завершено',
        'Paid': 'Оплачено'
    };
    return statusMap[status] || status;
}

// Order action functions (unchanged, but with added error handling)
async function changeStatus(orderId, currentStatus) {
    try {
        const newStatus = prompt('Введіть новий статус (Pending, Confirmed, Completed, Paid):', currentStatus);

        if (newStatus && newStatus !== currentStatus) {
            const response = await fetch(`${API_BASE_URL}orders/status/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                alert('Статус змінено');
                getOrders();
            } else {
                const error = await response.json();
                alert(error.message || 'Не вдалося змінити статус');
            }
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showErrorToUser('Помилка зміни статусу');
    }
}

async function cancelOrder(orderId) {
    try {
        if (!confirm('Ви впевнені, що хочете скасувати це замовлення?')) return;
        
        const response = await fetch(`${API_BASE_URL}orders/${orderId}/cancel`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            alert('Замовлення скасовано');
            getOrders();
        } else {
            const error = await response.json();
            alert(error.message || 'Не вдалося скасувати замовлення');
        }
    } catch (error) {
        console.error('Error canceling order:', error);
        showErrorToUser('Помилка скасування замовлення');
    }
}

// ... (keep all other order action functions with similar error handling)

// Initialize order creation form if it exists
function setupOrderCreation() {
    const orderForm = document.getElementById('createOrderForm');
    if (!orderForm) return;

    // Load services for dropdown
    loadServicesForDropdown().catch(error => {
        console.error('Error loading services:', error);
        showErrorToUser('Помилка завантаження послуг');
    });

    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const vin = document.getElementById('vinCode').value;
            const serviceSelect = document.getElementById('serviceSelect');
            const selectedServices = Array.from(serviceSelect.selectedOptions)
                .map(option => option.value);
            
            if (!vin || selectedServices.length === 0) {
                showErrorToUser('Введіть VIN-код та оберіть послуги');
                return;
            }

            const response = await fetch(`${API_BASE_URL}orders/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    services: selectedServices,
                    vin: vin
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Замовлення створено! ID: ${result.orderId}`);
                getOrders();
                orderForm.reset();
            } else {
                const error = await response.json();
                showErrorToUser(error.message || 'Помилка створення замовлення');
            }
        } catch (error) {
            console.error('Error creating order:', error);
            showErrorToUser('Помилка створення замовлення');
        }
    });
}

async function loadServicesForDropdown() {
    const response = await fetch(`${API_BASE_URL}services/`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch services');
    }
    
    const services = await response.json();
    const select = document.getElementById('serviceSelect');
    
    if (select) {
        select.innerHTML = '';
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = `${service.service_name} (${service.price} грн)`;
            select.appendChild(option);
        });
    }
}

async function getOrdersByUser(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}orders/${userId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch user orders');

        const orders = await response.json();
        renderUserOrders(orders);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        showErrorToUser('Не вдалося завантажити замовлення користувача');
    }
}

function renderUserOrders(orders) {
    const userOrdersTable = document.getElementById('userOrdersTable');
    if (!userOrdersTable) return;
    
    const tbody = userOrdersTable.getElementsByTagName('tbody')[0];
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!orders || !Array.isArray(orders)) {
        tbody.innerHTML = '<tr><td colspan="6">Немає замовлень цього користувача</td></tr>';
        return;
    }
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">Користувач не має замовлень</td></tr>';
        return;
    }
    
    orders.forEach(order => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${order.service || 'Невідома послуга'}</td>
            <td>${order.vin_code || 'Невідомий VIN'}</td>
            <td>${translateStatus(order.status || 'Pending')}</td>
            <td>${order.price ? order.price.toFixed(2) : '0.00'} грн</td>
            <td>${new Date(order.created_at).toLocaleString()}</td>
            <td>
                <button onclick="changeStatus(${order.id}, '${order.status}')">Змінити статус</button>
            </td>
        `;
    });
    
    // Show the user orders modal
    document.getElementById('userOrdersModal').style.display = 'block';
}

function closeUserOrdersModal() {
    document.getElementById('userOrdersModal').style.display = 'none';
}

// ... (keep all other existing functions)




async function completeOrder(orderId) {
    try {
        const token = localStorage.getItem('token'); // Отримуємо токен
        if (!token) {
            console.error('Токен відсутній! Користувач не авторизований.');
            alert('Помилка: Ви не авторизовані.');
            return;
        }

        const response = await fetch(`http://localhost:3000/api/orders/${orderId}/complete`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Помилка завершення замовлення:', data.message);
            alert(`Помилка: ${data.message}`);
            return;
        }

        console.log('Замовлення успішно завершене:', data);
        alert('Замовлення успішно завершене!');
        
        // Оновити інтерфейс, якщо потрібно (наприклад, перезавантажити сторінку)
        location.reload();
    } catch (error) {
        console.error('Помилка завершення замовлення:', error);
        alert('Сталася помилка. Спробуйте ще раз.');
    }
}


////////
// Function to create a new service or edit an existing one
function createService() {
    document.getElementById('serviceId').value = ''; // Reset the form
    document.getElementById('serviceName').value = '';
    document.getElementById('serviceDescription').value = '';
    document.getElementById('servicePrice').value = '';
    document.getElementById('modalTitle').textContent = 'Create Service';
    document.getElementById('serviceModal').style.display = 'block';
}

// Function to close the modal
function closeServiceModal() {
    document.getElementById('serviceModal').style.display = 'none';
}

// Function to submit the service form
document.getElementById('serviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const serviceId = document.getElementById('serviceId').value;
    const serviceName = document.getElementById('serviceName').value;
    const serviceDescription = document.getElementById('serviceDescription').value;
    const servicePrice = document.getElementById('servicePrice').value;

    const serviceData = {
        name: serviceName,
        description: serviceDescription,
        price: parseFloat(servicePrice),
    };

    try {
        let response;
        if (serviceId) {
            response = await fetch(`${API_BASE_URL}services/${serviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(serviceData),
            });
        } else {
            response = await fetch(`${API_BASE_URL}services`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(serviceData),
            });
        }

        if (!response.ok) {
            throw new Error('Failed to save service');
        }

        getServices(); // Refresh services list
        closeServiceModal();
    } catch (error) {
        console.error('Error:', error);
        showErrorToUser('Помилка при збереженні сервісу');
    }
});

// Function to get and display services
async function getServices() {
    try {
        const response = await fetch(`${API_BASE_URL}services/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch services');
        }

        const data = await response.json();
        const servicesTable = document.getElementById('servicesTable').getElementsByTagName('tbody')[0];
        servicesTable.innerHTML = '';

        data.forEach(service => {
            const row = servicesTable.insertRow();
            const price = parseFloat(service.price); // Перетворення на число
            row.setAttribute('data-id', service.id);
            row.innerHTML = `
                <td>${service.service_name}</td>
                <td>${service.description}</td>
                <td>${isNaN(price) ? 'N/A' : price.toFixed(2)} грн</td>
                <td>
                    <button onclick="editService(${service.id})">Edit</button>
                    <button onclick="deleteService(${service.id})">Delete</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error fetching services:', error);
        showErrorToUser('Не вдалося завантажити сервіси');
    }
}

// Function to edit a service
async function editService(serviceId) {
    try {
        const response = await fetch(`${API_BASE_URL}services/${serviceId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch service');
        }

        const service = await response.json();

        document.getElementById('serviceId').value = service.id;
        document.getElementById('serviceName').value = service.service_name;
        document.getElementById('serviceDescription').value = service.description;
        document.getElementById('servicePrice').value = service.price;

        document.getElementById('modalTitle').textContent = 'Edit Service';
        document.getElementById('serviceModal').style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        showErrorToUser('Не вдалося редагувати сервіс');
    }
}

// Function to delete a service
async function deleteService(serviceId) {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}services/${serviceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to delete service');
        }

        getServices(); // Refresh the services list
    } catch (error) {
        console.error('Error deleting service:', error);
        showErrorToUser('Не вдалося видалити сервіс');
    }
}

// Initialize services data when page loads
// Initialize the modal close button
document.addEventListener('DOMContentLoaded', () => {
    const closeButton = document.querySelector('.close-modal');
    getServices();
    if (closeButton) {
        closeButton.addEventListener('click', closeUserOrdersModal);
    }
});

