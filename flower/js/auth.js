// дефолтная аватарка
const DEFAULT_AVATAR = '/images/flower.png';

// элементы модального окна авторизации
const authModal = document.getElementById('auth-modal');
const authCloseBtn = authModal?.querySelector('.auth-modal-close');
const authTabs = authModal?.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');

// элементы модального окна профиля
const profileModal = document.getElementById('profile-modal');
const profileCloseBtn = document.getElementById('closeProfileModalBtn');
const cancelProfileBtn = document.getElementById('cancelProfileModalBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const avatarUpload = document.getElementById('avatarUpload');
const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
const modalAvatarPreview = document.getElementById('modalAvatarPreview');
const profileUsername = document.getElementById('profile-username');
const currentPasswordInput = document.getElementById('currentPassword');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

let tempAvatarFile = null;

// получение токена
function getToken() {
    return localStorage.getItem('auth_token');
}

// получение ID пользователя из токена
function getUserId() {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
    } catch {
        return null;
    }
}

// получение данных пользователя
function getUserData() {
    const userStr = localStorage.getItem('user_data');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    }
    return null;
}

// сохранение данных пользователя
function saveUserData(user) {
    localStorage.setItem('user_data', JSON.stringify(user));
}

// проверка авторизации
function isLoggedIn() {
    return !!getToken();
}

// обновление UI шапки
function updateHeaderAuth() {
    const headerIcons = document.querySelector('.header-icons');
    if (!headerIcons) return;
    
    const existingAuthBtn = headerIcons.querySelector('.auth-header-btn');
    const existingUserAvatar = headerIcons.querySelector('.user-avatar-header');
    
    if (isLoggedIn()) {
        const user = getUserData();
        if (existingAuthBtn) existingAuthBtn.remove();
        if (existingUserAvatar) existingUserAvatar.remove();
        
        const userAvatar = document.createElement('div');
        userAvatar.className = 'user-avatar-header';
        userAvatar.innerHTML = `
            <img class="user-avatar-img" src="${user?.avatar || DEFAULT_AVATAR}" alt="avatar">
            <span class="user-avatar-name">${user?.username || 'User'}</span>
            <div class="profile-dropdown">
                <div class="profile-dropdown-item" id="dropdown-profile">Профиль</div>
                <div class="profile-dropdown-item" id="dropdown-edit-profile">Редактировать</div>
                <div class="profile-dropdown-divider"></div>
                <div class="profile-dropdown-item" id="dropdown-logout">Выйти</div>
            </div>
        `;
        headerIcons.appendChild(userAvatar);
        
        userAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = userAvatar.querySelector('.profile-dropdown');
            document.querySelectorAll('.profile-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.remove('show');
            });
            dropdown.classList.toggle('show');
        });
        
        document.getElementById('dropdown-profile')?.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
        
        document.getElementById('dropdown-edit-profile')?.addEventListener('click', () => {
            openProfileModal();
        });
        
        document.getElementById('dropdown-logout')?.addEventListener('click', logout);
        
        document.addEventListener('click', () => {
            document.querySelectorAll('.profile-dropdown').forEach(d => {
                d.classList.remove('show');
            });
        });
        
    } else {
        if (existingUserAvatar) existingUserAvatar.remove();
        if (!existingAuthBtn) {
            const authBtn = document.createElement('button');
            authBtn.className = 'auth-header-btn';
            authBtn.textContent = 'Войти / Регистрация';
            authBtn.addEventListener('click', openAuthModal);
            headerIcons.appendChild(authBtn);
        }
    }
}

// выход из аккаунта
function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    updateHeaderAuth();
    showToast(`Вы вышли из аккаунта`);
    window.location.reload();
}

// открытие модального окна авторизации
function openAuthModal() {
    authModal.classList.add('active');
    loginForm?.reset();
    registerForm?.reset();
    loginError?.classList.remove('active');
    registerError?.classList.remove('active');
    document.querySelector('.auth-tab.active')?.click();
}

// закрытие модального окна авторизации
function closeAuthModal() {
    authModal.classList.remove('active');
}

// открытие модального окна профиля
function openProfileModal() {
    const user = getUserData();
    if (profileUsername) {
        profileUsername.value = user?.username || '';
    }
    if (modalAvatarPreview) {
        modalAvatarPreview.src = user?.avatar || DEFAULT_AVATAR;
    }
    currentPasswordInput.value = '';
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
    tempAvatarFile = null;
    
    profileModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// закрытие модального окна профиля
function closeProfileModal() {
    profileModal.classList.remove('active');
    document.body.style.overflow = '';
    tempAvatarFile = null;
}

// загрузка аватара на сервер
async function uploadAvatar(file) {
    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) return null;
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/upload-avatar/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (response.ok) {
            const data = await response.json();
            return data.avatar;
        }
        return null;
    } catch (error) {
        console.error('Ошибка загрузки аватара:', error);
        return null;
    }
}

// смена пароля
async function changePassword(currentPassword, newPassword) {
    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) return false;
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/change-password/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
        });
        return response.ok;
    } catch (error) {
        console.error('Ошибка смены пароля:', error);
        return false;
    }
}

// сохранение профиля
async function saveProfile() {
    const currentPwd = currentPasswordInput.value;
    const newPwd = newPasswordInput.value;
    const confirmPwd = confirmPasswordInput.value;
    
    const hasPasswordChange = newPwd.length > 0;
    const hasAvatarChange = !!tempAvatarFile;
    
    if (!hasPasswordChange && !hasAvatarChange) {
        closeProfileModal();
        return;
    }
    
    if (hasPasswordChange) {
        if (!currentPwd) {
            showToast(`Введите текущий пароль`);
            return;
        }
        if (newPwd !== confirmPwd) {
            showToast(`Новые пароли не совпадают`);
            return;
        }
        if (newPwd.length < 4) {
            showToast(`Новый пароль должен содержать не менее 4 символов`);
            return;
        }
    }
    
    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = 'Сохранение...';
    
    try {
        let newAvatarUrl = null;
        let passwordChanged = false;
        
        if (hasAvatarChange) {
            newAvatarUrl = await uploadAvatar(tempAvatarFile);
            if (newAvatarUrl) {
                const user = getUserData();
                user.avatar = newAvatarUrl;
                saveUserData(user);
                const avatarImg = document.querySelector('.user-avatar-img');
                if (avatarImg) avatarImg.src = newAvatarUrl;
            }
        }
        
        if (hasPasswordChange) {
            passwordChanged = await changePassword(currentPwd, newPwd);
            if (!passwordChanged) {
                showToast(`Текущий пароль неверный`);
                saveProfileBtn.disabled = false;
                saveProfileBtn.textContent = 'Сохранить';
                return;
            }
        }
        
        showToast(`Профиль успешно обновлен`);
        closeProfileModal();
        if (passwordChanged) {
            setTimeout(() => {
                showToast(`Для продолжения войтите снова`);
                logout();
            }, 1000);
        } else {
            window.location.reload();
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast(`Произошла ошибка при сохранении`);
    } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = 'Сохранить';
    }
}

// переключение между вкладками авторизации
if (authTabs) {
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            if (tabName === 'login') {
                loginForm?.classList.remove('hidden');
                registerForm?.classList.add('hidden');
            } else {
                loginForm?.classList.add('hidden');
                registerForm?.classList.remove('hidden');
            }
            
            loginError?.classList.remove('active');
            registerError?.classList.remove('active');
        });
    });
}

// закрытие модальных окон по крестику
if (authCloseBtn) authCloseBtn.addEventListener('click', closeAuthModal);
if (profileCloseBtn) profileCloseBtn.addEventListener('click', closeProfileModal);
if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', closeProfileModal);

// закрытие по клику на фон
if (authModal) {
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) closeAuthModal();
    });
}
if (profileModal) {
    profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) closeProfileModal();
    });
}

// загрузка аватара в модальном окне
if (uploadAvatarBtn) {
    uploadAvatarBtn.addEventListener('click', () => avatarUpload.click());
}
if (avatarUpload) {
    avatarUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.size <= 5 * 1024 * 1024) {
            tempAvatarFile = file;
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (modalAvatarPreview) modalAvatarPreview.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        } else if (file) {
            showToast(`Файл не должен превышать 5 mb`);
        }
    });
}

// сохранение профиля
if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', saveProfile);
}

// вход
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.classList.remove('active');
        
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            loginError.textContent = 'Заполните все поля';
            loginError.classList.add('active');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('auth_token', data.token);
                saveUserData({
                    id: data.user_id,
                    username: username,
                    avatar: data.avatar || DEFAULT_AVATAR
                });
                updateHeaderAuth();
                closeAuthModal();
                showToast(`Добро пожаловать, ${username}!`);
                window.location.reload();
            } else {
                const error = await response.json();
                loginError.textContent = error.error || 'Неверный логин или пароль';
                loginError.classList.add('active');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            loginError.textContent = 'Ошибка соединения. Попробуйте позже.';
            loginError.classList.add('active');
        }
    });
}

// регистрация
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerError.classList.remove('active');
        
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        
        if (!username || !password) {
            registerError.textContent = 'Заполните все поля';
            registerError.classList.add('active');
            return;
        }
        
        if (username.length < 3) {
            registerError.textContent = 'Логин должен содержать не менее 3 символов';
            registerError.classList.add('active');
            return;
        }
        
        if (password.length < 4) {
            registerError.textContent = 'Пароль должен содержать не менее 4 символов';
            registerError.classList.add('active');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('auth_token', data.token);
                saveUserData({
                    id: data.user_id,
                    username: username,
                    avatar: DEFAULT_AVATAR
                });
                updateHeaderAuth();
                closeAuthModal();
                showToast(`Регистрация прошла успешно! Добро пожаловать, ${username}`);
                window.location.reload();
            } else {
                const error = await response.json();
                registerError.textContent = error.error || 'Ошибка регистрации. Логин уже используется.';
                registerError.classList.add('active');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            registerError.textContent = 'Ошибка соединения. Попробуйте позже.';
            registerError.classList.add('active');
        }
    });
}

// инициализация
document.addEventListener('DOMContentLoaded', () => {
    updateHeaderAuth();
});

// глобальные функции
window.isLoggedIn = isLoggedIn;
window.getToken = getToken;
window.getUserData = getUserData;
window.logout = logout;