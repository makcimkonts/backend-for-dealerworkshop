// Define the API URL and JWT token directly, or load them from localStorage/sessionStorage
const API_BASE_URL = 'http://localhost:3000/api/';  // Update with the correct base URL for your API
let token = localStorage.getItem('token');
console.log(token);  // Check if the token is retrieved correctly

// Function to get all users
// Функція для отримання всіх користувачів
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
        usersTable.innerHTML = ''; // Очищаємо таблицю перед заповненням

        data.forEach(user => {
            const row = usersTable.insertRow();
            row.setAttribute('data-id', user.id);  // Додаємо ID користувача
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

        // Додаємо обробники подій для редагування
        const editableCells = document.querySelectorAll('.editable');
        editableCells.forEach(cell => {
            cell.addEventListener('dblclick', function() {
                editCell(cell); // Викликаємо функцію редагування
            });
        });

    } catch (error) {
        console.error('Error fetching users:', error);
    }
}


// Function to edit a cell
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

    // Якщо значення змінилося, оновлюємо тільки це поле
    if (newValue !== originalValue) {
        const userId = cell.closest('tr').getAttribute('data-id'); // Отримуємо ID користувача

        // Створюємо об'єкт для оновлення лише того поля, яке змінилося
        const updatedData = {};
        updatedData[field] = newValue;

        const response = await fetch(`${API_BASE_URL}user/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData),  // Відправляємо лише одне змінене поле
        });

        if (response.ok) {
            console.log('User updated successfully');
            getUsers(); // Оновлюємо список користувачів
        } else {
            console.log('Failed to update user');
        }
    } else {
        // Якщо значення не змінилося, відновлюємо початкове значення
        cell.textContent = originalValue;
    }
}



// Function to delete a user
async function deleteUser(userId) {
    const response = await fetch(`${API_BASE_URL}user/${userId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (response.ok) {
        alert('User deleted successfully');
        getUsers(); // Refresh the users list
    } else {
        alert('Failed to delete user');
    }
}

// Function to create a new user (unchanged)
async function createUser() {
    const login = prompt('Enter login:');
    const password = prompt('Enter password:');
    const firstName = prompt('Enter first name:');
    const lastName = prompt('Enter last name:');
    const vinCode = prompt('Enter VIN code:');
    const role = prompt('Enter role (user/manager/admin):');

    const response = await fetch(`${API_BASE_URL}user/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login, password, first_name: firstName, last_name: lastName, vin_code: vinCode, role })
    });

    if (response.ok) {
        alert('User created successfully');
        getUsers(); // Refresh the users list
    } else {
        alert('Failed to create user');
    }
}

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





// Функція для створення нового користувача
async function createUser() {
    const login = prompt('Enter login:');
    const password = prompt('Enter password:');
    const firstName = prompt('Enter first name:');
    const lastName = prompt('Enter last name:');
    const vinCode = prompt('Enter VIN code:');
    const role = prompt('Enter role (user/manager/admin):');

    const response = await fetch(`${API_BASE_URL}user/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login, password, first_name: firstName, last_name: lastName, vin_code: vinCode, role })
    });

    if (response.ok) {
        alert('User created successfully');
        getUsers(); // Оновлюємо список користувачів
    } else {
        alert('Failed to create user');
    }
}

// // Функція для редагування користувача
// async function editUser(userId) {
//     const newEmail = prompt('Enter new email:');
//     const newRole = prompt('Enter new role (admin/user):');
//     const newBalance = prompt('Enter new balance:');

//     const response = await fetch(`${API_BASE_URL}user/${userId}`, {
//         method: 'PUT',
//         headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ email: newEmail, role: newRole, balance: newBalance })
//     });

//     if (response.ok) {
//         alert('User updated successfully');
//         getUsers(); // Оновлюємо список користувачів
//     } else {
//         alert('Failed to update user');
//     }
// }

// Функція для видалення користувача
async function deleteUser(userId) {
    const response = await fetch(`${API_BASE_URL}user/${userId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (response.ok) {
        alert('User deleted successfully');
        getUsers(); // Оновлюємо список користувачів
    } else {
        alert('Failed to delete user');
    }
}

// Завантажуємо список користувачів при завантаженні сторінки
window.onload = getUsers;
