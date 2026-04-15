// profile.js - полностью исправленная версия
const PROFILE_API_URL = API_BASE_URL;

function getProfileToken() {
    return localStorage.getItem('auth_token');
}

function getUserId() {
    const token = getProfileToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
    } catch {
        return null;
    }
}

function showProfileToast(message) {
    const existingToasts = document.querySelectorAll('.toast-notification');
    if (existingToasts.length >= 3) {
        existingToasts[0].remove();
    }
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 300);
        }
    }, 3000);
}

// Получение CSRF токена
async function getCsrfToken() {
    try {
        const response = await fetch(`${PROFILE_API_URL}/users/csrf/`, {
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            return data.csrfToken;
        }
        return null;
    } catch (error) {
        console.error('Error getting CSRF token:', error);
        return null;
    }
}

// Переключение вкладок
function initProfileTabs() {
    const tabs = document.querySelectorAll('.profile-tab-btn');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabs.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tab}`).classList.add('active');
            
            if (tab === 'cart') loadUserCart();
            if (tab === 'favorites') loadUserFavorites();
            if (tab === 'orders') loadUserOrders();
        });
    });
}

// Загрузка корзины
async function loadUserCart() {
    const container = document.getElementById('cart-container');
    const token = getProfileToken();
    
    console.log('Loading cart, token exists:', !!token);
    
    if (!token) {
        container.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>Войдите в аккаунт</p></div>';
        return;
    }
    
    try {
        const csrfToken = await getCsrfToken();
        const response = await fetch(`${PROFILE_API_URL}/cart/my-cart/`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'X-CSRFToken': csrfToken || ''
            },
            credentials: 'include'
        });
        
        console.log('Cart response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Cart data from API:', data);
        
        // Ваш API возвращает items в формате: [{id, name, price, quantity, image, total}, ...]
        // Проверяем разные возможные структуры ответа
        let items = [];
        
        if (data.items && Array.isArray(data.items)) {
            items = data.items;
        } else if (data.cart && Array.isArray(data.cart)) {
            items = data.cart;
        } else if (data.results && Array.isArray(data.results)) {
            items = data.results;
        } else if (Array.isArray(data)) {
            items = data;
        }
        
        console.log('Parsed items:', items);
        
        if (items.length === 0) {
            container.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>Корзина пуста</p><a href="/catalog.html" class="btn btn-small">Перейти в каталог</a></div>';
            return;
        }
        
        let html = '';
        let total = 0;
        
        items.forEach((item, index) => {
            // Поддержка разных форматов данных от API
            const id = item.id || item.product_id || item.flower_id || index;
            const name = item.name || item.product_name || item.flower_name || 'Товар';
            const price = parseFloat(item.price || item.current_price || item.flower_price || 0);
            const quantity = item.quantity || 1;
            const itemTotal = price * quantity;
            total += itemTotal;
            
            // Получаем URL изображения
            let imageUrl = item.image || item.image_url;
            if (!imageUrl && item.flower && item.flower.image) {
                imageUrl = item.flower.image;
            }
            if (!imageUrl) {
                imageUrl = 'https://i.pinimg.com/736x/97/78/33/9778339cf8a1e1e1851e6b6ed4ce81c6.jpg';
            }
            // Если imageUrl начинается с /media/, добавляем API_BASE_URL если нужно
            if (imageUrl.startsWith('/media/')) {
                imageUrl = imageUrl;
            }
            
            html += `
                <div class="cart-item" data-id="${id}" data-product-id="${id}">
                    <img class="cart-item-image" src="${imageUrl}" alt="${escapeHtml(name)}" onerror="this.src='https://i.pinimg.com/736x/97/78/33/9778339cf8a1e1e1851e6b6ed4ce81c6.jpg'">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${escapeHtml(name)}</div>
                        <div class="cart-item-price">${price.toLocaleString()} ₽</div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="quantity-control">
                            <button class="quantity-btn minus" data-id="${id}">-</button>
                            <span class="quantity-value">${quantity}</span>
                            <button class="quantity-btn plus" data-id="${id}">+</button>
                        </div>
                        <button class="remove-item" data-id="${id}"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
        });
        
        html += `
            <div class="cart-summary">
                <div class="cart-summary-row total">
                    <span>Итого:</span>
                    <span>${total.toLocaleString()} ₽</span>
                </div>
                <button class="cart-checkout-btn" id="checkoutBtn">Оформить заказ</button>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Обработчики событий
        document.querySelectorAll('.quantity-btn.minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                updateCartQuantity(id, -1);
            });
        });
        
        document.querySelectorAll('.quantity-btn.plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                updateCartQuantity(id, 1);
            });
        });
        
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                removeCartItem(id);
            });
        });
        
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => checkoutWithCart(items));
        }
        
    } catch(error) {
        console.error('Load cart error:', error);
        container.innerHTML = '<div class="empty-cart"><i class="fas fa-exclamation-triangle"></i><p>Ошибка загрузки корзины. Попробуйте обновить страницу.</p><button onclick="location.reload()" class="btn btn-small">Обновить</button></div>';
    }
}

// Оформление заказа из корзины
function checkoutWithCart(items) {
    if (!items || items.length === 0) {
        showProfileToast('Корзина пуста');
        return;
    }
    
    // Преобразуем элементы корзины в формат для модального окна
    const cartItems = items.map(item => ({
        id: item.id || item.product_id,
        name: item.name || item.product_name,
        price: parseFloat(item.price || 0),
        quantity: item.quantity || 1,
        image: item.image || 'https://i.pinimg.com/736x/97/78/33/9778339cf8a1e1e1851e6b6ed4ce81c6.jpg'
    }));
    
    if (typeof window.openOrderModalForCart === 'function') {
        window.openOrderModalForCart(cartItems);
    } else {
        showProfileToast('Функция оформления заказа временно недоступна');
    }
}

// Обновление количества товара в корзине
async function updateCartQuantity(productId, delta) {
    const token = getProfileToken();
    
    try {
        // Сначала получаем текущую корзину
        const response = await fetch(`${PROFILE_API_URL}/cart/my-cart/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const items = data.items || data.cart || [];
        const item = items.find(i => (i.id || i.product_id) == productId);
        
        if (!item) return;
        
        const currentQty = item.quantity || 1;
        const newQty = currentQty + delta;
        
        if (newQty < 1) {
            await removeCartItem(productId);
            return;
        }
        
        const csrfToken = await getCsrfToken();
        await fetch(`${PROFILE_API_URL}/cart/update/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-CSRFToken': csrfToken || ''
            },
            credentials: 'include',
            body: JSON.stringify({ productId: parseInt(productId), quantity: newQty })
        });
        
        await loadUserCart();
        
        // Обновляем счетчик в шапке
        if (typeof window.loadCart === 'function') {
            window.loadCart();
        }
        
    } catch(error) {
        console.error('Update quantity error:', error);
        showProfileToast('Ошибка обновления количества');
    }
}

// Удаление товара из корзины
async function removeCartItem(productId) {
    const token = getProfileToken();
    
    try {
        const csrfToken = await getCsrfToken();
        await fetch(`${PROFILE_API_URL}/cart/remove/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-CSRFToken': csrfToken || ''
            },
            credentials: 'include',
            body: JSON.stringify({ productId: parseInt(productId) })
        });
        
        await loadUserCart();
        showProfileToast('Товар удален из корзины');
        
        // Обновляем счетчик в шапке
        if (typeof window.loadCart === 'function') {
            window.loadCart();
        }
        
    } catch(error) {
        console.error('Remove item error:', error);
        showProfileToast('Ошибка удаления товара');
    }
}

// Загрузка избранного
async function loadUserFavorites() {
    const container = document.getElementById('favorites-container');
    const token = getProfileToken();
    
    if (!token) {
        container.innerHTML = '<div class="empty-favorites"><i class="fas fa-heart"></i><p>Войдите в аккаунт</p></div>';
        return;
    }
    
    try {
        const csrfToken = await getCsrfToken();
        const favResponse = await fetch(`${PROFILE_API_URL}/favorites/my-favorites/`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'X-CSRFToken': csrfToken || ''
            },
            credentials: 'include'
        });
        const favData = await favResponse.json();
        const favoriteIds = favData.favorites || [];
        
        if (favoriteIds.length === 0) {
            container.innerHTML = '<div class="empty-favorites"><i class="fas fa-heart"></i><p>Нет избранных товаров</p><a href="/catalog.html" class="btn btn-small">Перейти в каталог</a></div>';
            return;
        }
        
        const productsResponse = await fetch(`${PROFILE_API_URL}/products/`);
        const allProducts = await productsResponse.json();
        const favorites = allProducts.filter(p => favoriteIds.includes(p.id));
        
        if (favorites.length === 0) {
            container.innerHTML = '<div class="empty-favorites"><i class="fas fa-heart"></i><p>Нет избранных товаров</p><a href="/catalog.html" class="btn btn-small">Перейти в каталог</a></div>';
            return;
        }
        
        let html = '<div class="products-grid">';
        favorites.forEach(product => {
            const imageUrl = product.image || 'https://i.pinimg.com/736x/97/78/33/9778339cf8a1e1e1851e6b6ed4ce81c6.jpg';
            html += `
                <div class="product-card">
                    <div class="product-img" style="background-image: url(${imageUrl})"></div>
                    <div class="product-info">
                        <h3>${escapeHtml(product.name)}</h3>
                        <p>${escapeHtml(product.description ? product.description.substring(0, 80) : '')}</p>
                        <div class="product-price">
                            <span class="current-price">${(product.price || 0).toLocaleString()} ₽</span>
                        </div>
                        <div class="product-buttons">
                            <button class="btn-small remove-fav-btn" data-id="${product.id}">Удалить</button>
                            <button class="btn-small add-to-cart-fav" data-id="${product.id}" data-name="${escapeHtml(product.name)}" data-price="${product.price || 0}" data-image="${imageUrl}">В корзину</button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
        
        document.querySelectorAll('.remove-fav-btn').forEach(btn => {
            btn.addEventListener('click', () => removeFavoriteItem(parseInt(btn.dataset.id)));
        });
        
        document.querySelectorAll('.add-to-cart-fav').forEach(btn => {
            btn.addEventListener('click', () => addToCartFromFavorite(
                parseInt(btn.dataset.id),
                btn.dataset.name,
                parseFloat(btn.dataset.price),
                btn.dataset.image
            ));
        });
        
    } catch(error) {
        console.error('Load favorites error:', error);
        container.innerHTML = '<div class="empty-favorites"><i class="fas fa-exclamation-triangle"></i><p>Ошибка загрузки избранного</p><button onclick="loadUserFavorites()" class="btn btn-small">Повторить</button></div>';
    }
}

// Удаление из избранного
async function removeFavoriteItem(productId) {
    const token = getProfileToken();
    
    try {
        const csrfToken = await getCsrfToken();
        await fetch(`${PROFILE_API_URL}/favorites/remove/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-CSRFToken': csrfToken || ''
            },
            credentials: 'include',
            body: JSON.stringify({ productId })
        });
        
        await loadUserFavorites();
        showProfileToast('Товар удален из избранного');
        
        // Обновляем избранное в catalog.js
        if (typeof window.loadFavorites === 'function') {
            window.loadFavorites();
        }
        
    } catch(error) {
        console.error('Remove favorite error:', error);
        showProfileToast('Ошибка удаления из избранного');
    }
}

// Добавление в корзину из избранного
async function addToCartFromFavorite(productId, name, price, image) {
    const token = getProfileToken();
    
    try {
        const csrfToken = await getCsrfToken();
        const response = await fetch(`${PROFILE_API_URL}/cart/add/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-CSRFToken': csrfToken || ''
            },
            credentials: 'include',
            body: JSON.stringify({ productId, quantity: 1 })
        });
        
        if (response.ok) {
            showProfileToast(`${name} добавлен в корзину`);
            // Обновляем корзину
            await loadUserCart();
            if (typeof window.loadCart === 'function') {
                window.loadCart();
            }
        } else {
            showProfileToast('Ошибка добавления в корзину');
        }
        
    } catch(error) {
        console.error('Add to cart error:', error);
        showProfileToast('Ошибка добавления в корзину');
    }
}

// Загрузка заказов
async function loadUserOrders() {
    const container = document.getElementById('orders-container');
    const token = getProfileToken();
    
    if (!token) {
        container.innerHTML = '<div class="empty-orders"><i class="fas fa-box-open"></i><p>Войдите в аккаунт</p></div>';
        return;
    }
    
    try {
        const csrfToken = await getCsrfToken();
        const response = await fetch(`${PROFILE_API_URL}/orders/`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'X-CSRFToken': csrfToken || ''
            },
            credentials: 'include'
        });
        const data = await response.json();
        const orders = data.orders || data.results || [];
        
        if (orders.length === 0) {
            container.innerHTML = '<div class="empty-orders"><i class="fas fa-box-open"></i><p>У вас пока нет заказов</p><a href="/catalog.html" class="btn btn-small">Сделать первый заказ</a></div>';
            return;
        }
        
        const statusMap = {
            'pending': 'Ожидает обработки',
            'confirmed': 'Подтвержден',
            'shipped': 'Отправлен',
            'delivered': 'Доставлен',
            'cancelled': 'Отменен'
        };
        
        let html = '';
        orders.forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            const status = statusMap[order.status] || order.status;
            
            let itemsHtml = '';
            const orderItems = order.order_items || [];
            if (orderItems.length > 0) {
                itemsHtml = '<div class="order-products">';
                orderItems.forEach(item => {
                    const flower = item.flower || {};
                    itemsHtml += `
                        <div class="order-product">
                            <div class="order-product-info">
                                <div class="order-product-name">${escapeHtml(flower.name || 'Товар')}</div>
                                <div class="order-product-quantity">Количество: ${item.quantity || 1}</div>
                                <div class="order-product-price-item">${(item.price_at_time || 0).toLocaleString()} ₽</div>
                            </div>
                            <div class="order-product-price">${((item.price_at_time || 0) * (item.quantity || 1)).toLocaleString()} ₽</div>
                        </div>
                    `;
                });
                itemsHtml += '</div>';
            }
            
            html += `
                <div class="order-card">
                    <div class="order-header" onclick="toggleOrderBody(this)">
                        <div class="order-header-left">
                            <div class="order-header-item">
                                <span class="order-header-label">Заказ №</span>
                                <span class="order-header-value order-id">${order.id}</span>
                            </div>
                            <div class="order-header-item">
                                <span class="order-header-label">Дата</span>
                                <span class="order-header-value">${date}</span>
                            </div>
                            <div class="order-header-item">
                                <span class="order-header-label">Статус</span>
                                <span class="order-header-value">${escapeHtml(status)}</span>
                            </div>
                            <div class="order-header-item">
                                <span class="order-header-label">Сумма</span>
                                <span class="order-header-value order-total">${(order.total_price || 0).toLocaleString()} ₽</span>
                            </div>
                        </div>
                        <button class="order-toggle"><i class="fas fa-chevron-down"></i></button>
                    </div>
                    <div class="order-body">
                        ${itemsHtml}
                        <div class="order-delivery-info">
                            <div><strong>Адрес доставки:</strong> ${escapeHtml(order.address || 'не указан')}</div>
                            <div><strong>Телефон:</strong> ${escapeHtml(order.phone || 'не указан')}</div>
                            ${order.comment ? `<div><strong>Комментарий:</strong> ${escapeHtml(order.comment)}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch(error) {
        console.error('Load orders error:', error);
        container.innerHTML = '<div class="empty-orders"><i class="fas fa-exclamation-triangle"></i><p>Ошибка загрузки заказов</p><button onclick="loadUserOrders()" class="btn btn-small">Повторить</button></div>';
    }
}

// Функция для переключения тела заказа
window.toggleOrderBody = function(header) {
    const orderBody = header.nextElementSibling;
    const toggleBtn = header.querySelector('.order-toggle');
    orderBody.classList.toggle('open');
    if (toggleBtn) {
        toggleBtn.classList.toggle('open');
    }
};

// Функция для экранирования HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    console.log('Profile page loaded');
    initProfileTabs();
    loadUserCart();
    loadUserFavorites();
    loadUserOrders();
});