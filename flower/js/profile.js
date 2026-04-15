let userCart = [];
let userOrders = [];
let selectedItems = new Set(); // Хранит ID выбранных товаров

function getToken() {
    return localStorage.getItem('auth_token');
}

function isLoggedIn() {
    return !!getToken();
}

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

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };
}

function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Переключение вкладок
function initTabs() {
    const cartBtn = document.querySelector('.profile-tab-btn[data-tab="cart"]');
    const ordersBtn = document.querySelector('.profile-tab-btn[data-tab="orders"]');
    const cartTab = document.getElementById('tab-cart');
    const ordersTab = document.getElementById('tab-orders');
    
    if (cartBtn && ordersBtn && cartTab && ordersTab) {
        const newCartBtn = cartBtn.cloneNode(true);
        const newOrdersBtn = ordersBtn.cloneNode(true);
        cartBtn.parentNode.replaceChild(newCartBtn, cartBtn);
        ordersBtn.parentNode.replaceChild(newOrdersBtn, ordersBtn);
        
        newCartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            cartTab.classList.add('active');
            ordersTab.classList.remove('active');
            newCartBtn.classList.add('active');
            newOrdersBtn.classList.remove('active');
        });
        
        newOrdersBtn.addEventListener('click', function(e) {
            e.preventDefault();
            ordersTab.classList.add('active');
            cartTab.classList.remove('active');
            newOrdersBtn.classList.add('active');
            newCartBtn.classList.remove('active');
        });
    }
}

// Загрузка корзины
async function loadCart() {
    const container = document.getElementById('cart-container');
    if (!container) return;
    
    if (!isLoggedIn()) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Ваша корзина пуста</p>
                <a href="catalog.html" class="btn btn-small">Перейти в каталог</a>
            </div>
        `;
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart/?userId=${getUserId()}`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            userCart = data.cart || [];
            selectedItems.forEach(id => {
                if (!userCart.find(item => item.id === id)) {
                    selectedItems.delete(id);
                }
            });
        } else {
            userCart = [];
        }
    } catch(e) {
        console.log('Ошибка загрузки корзины (бекенд не запущен):', e);
        userCart = [];
    }
    renderCart();
}

// Отображение корзины с чекбоксами и кнопками избранного
function renderCart() {
    const container = document.getElementById('cart-container');
    if (!container) return;
    
    if (!userCart.length) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Ваша корзина пуста</p>
                <a href="catalog.html" class="btn btn-small">Перейти в каталог</a>
            </div>
        `;
        return;
    }
    
    let total = 0;
    let selectedTotal = 0;
    let html = '<div class="cart-items">';
    
    userCart.forEach(item => {
        const quantity = item.quantity || 1;
        const itemTotal = (item.price || 0) * quantity;
        total += itemTotal;
        const isSelected = selectedItems.has(item.id);
        if (isSelected) selectedTotal += itemTotal;
        
        const isFav = window.isFavorite ? window.isFavorite(item.id) : false;
        
        html += `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-checkbox-wrapper">
                    <input type="checkbox" class="cart-item-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
                </div>
                <img class="cart-item-image" src="${item.image || 'https://i.pinimg.com/736x/97/78/33/9778339cf8a1e1e1851e6b6ed4ce81c6.jpg'}" alt="${escapeHTML(item.name)}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${escapeHTML(item.name)}</div>
                    <div class="cart-item-price">${(item.price || 0).toLocaleString()} ₽</div>
                    <div class="cart-item-total">Сумма: ${itemTotal.toLocaleString()} ₽</div>
                </div>
                <div class="cart-item-actions">
                    <button class="cart-wishlist-btn ${isFav ? 'active' : ''}" data-id="${item.id}" title="В избранное">
                        <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <div class="quantity-control">
                        <button class="quantity-btn minus" data-id="${item.id}">-</button>
                        <span class="quantity-value">${quantity}</span>
                        <button class="quantity-btn plus" data-id="${item.id}">+</button>
                    </div>
                    <button class="remove-item" data-id="${item.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    const totalItems = userCart.reduce((s, i) => s + (i.quantity || 1), 0);
    const selectedItemsCount = selectedItems.size;
    const isCheckoutDisabled = selectedItemsCount === 0;
    
    html += '</div>';
    html += `
        <div class="cart-summary">
            <div class="cart-summary-row">
                <label class="select-all-label">
                    <input type="checkbox" id="select-all-checkbox" ${selectedItemsCount === userCart.length ? 'checked' : ''}>
                    Выбрать все
                </label>
            </div>
            <div class="cart-summary-row">
                <span>Выбрано товаров (${selectedItemsCount} шт.)</span>
                <span>${selectedTotal.toLocaleString()} ₽</span>
            </div>
            <div class="cart-summary-row">
                <span>Всего товаров (${totalItems} шт.)</span>
                <span>${total.toLocaleString()} ₽</span>
            </div>
            <div class="cart-summary-row total">
                <span>Итого к оплате</span>
                <span>${selectedTotal.toLocaleString()} ₽</span>
            </div>
            <button class="btn cart-checkout-btn" id="checkout-btn" ${isCheckoutDisabled ? 'disabled' : ''}>
                Оформить заказ (${selectedItemsCount})
            </button>
            ${isCheckoutDisabled ? '<p class="cart-checkout-message">✓ Выберите хотя бы один товар для оформления заказа</p>' : ''}
        </div>
    `;
    
    container.innerHTML = html;
    
    document.querySelectorAll('.cart-item-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            const id = parseInt(this.dataset.id);
            if (this.checked) {
                selectedItems.add(id);
            } else {
                selectedItems.delete(id);
            }
            renderCart();
        });
    });
    
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            if (this.checked) {
                userCart.forEach(item => selectedItems.add(item.id));
            } else {
                selectedItems.clear();
            }
            renderCart();
        });
    }
    
    document.querySelectorAll('.quantity-btn.minus').forEach(btn => {
        btn.addEventListener('click', () => updateCartQuantity(parseInt(btn.dataset.id), -1));
    });
    document.querySelectorAll('.quantity-btn.plus').forEach(btn => {
        btn.addEventListener('click', () => updateCartQuantity(parseInt(btn.dataset.id), 1));
    });
    
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id)));
    });
    
    document.querySelectorAll('.cart-wishlist-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            const productId = parseInt(this.dataset.id);
            
            let product = null;
            if (window.bouquetsData) {
                for (const cat in window.bouquetsData) {
                    if (window.bouquetsData[cat] && window.bouquetsData[cat].products) {
                        product = window.bouquetsData[cat].products.find(p => p.id === productId);
                        if (product) break;
                    }
                }
            }
            
            if (product && typeof window.toggleFavorite === 'function') {
                await window.toggleFavorite(productId);
                const isNowFav = window.isFavorite ? window.isFavorite(productId) : false;
                if (isNowFav) {
                    this.classList.add('active');
                    this.innerHTML = '<i class="fas fa-heart"></i>';
                    showToast(`${product.name} добавлен в избранное`);
                } else {
                    this.classList.remove('active');
                    this.innerHTML = '<i class="far fa-heart"></i>';
                    showToast(`${product.name} удален из избранного`);
                }
            } else if (typeof window.toggleFavorite === 'function') {
                await window.toggleFavorite(productId);
                const isNowFav = window.isFavorite ? window.isFavorite(productId) : false;
                if (isNowFav) {
                    this.classList.add('active');
                    this.innerHTML = '<i class="fas fa-heart"></i>';
                } else {
                    this.classList.remove('active');
                    this.innerHTML = '<i class="far fa-heart"></i>';
                }
            } else {
                showToast('Войдите в аккаунт для добавления в избранное');
            }
        });
    });
    
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn && !isCheckoutDisabled) {
        checkoutBtn.addEventListener('click', () => checkout());
    }
}

// Обновление количества товара
async function updateCartQuantity(productId, delta) {
    const item = userCart.find(i => i.id === productId);
    if (!item) return;
    
    const newQuantity = (item.quantity || 1) + delta;
    if (newQuantity < 1) {
        await removeFromCart(productId);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart/update/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                userId: getUserId(),
                productId: productId,
                quantity: newQuantity
            })
        });
        
        if (response.ok) {
            await loadCart();
        }
    } catch(e) {
        console.error('Ошибка обновления количества:', e);
    }
}

// Удаление товара из корзины
async function removeFromCart(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/cart/remove/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                userId: getUserId(),
                productId: productId
            })
        });
        
        if (response.ok) {
            selectedItems.delete(productId);
            await loadCart();
        }
    } catch(e) {
        console.error('Ошибка удаления из корзины:', e);
    }
}

// Оформление заказа (из корзины)
async function checkout() {
    if (selectedItems.size === 0) {
        showToast(`Выберите хотя бы один товар`);
        return;
    }
    
    const itemsToOrder = userCart.filter(item => selectedItems.has(item.id));
    
    if (!itemsToOrder.length) {
        showToast(`Нет товаров для оформления заказа`);
        return;
    }
    
    if (typeof window.openOrderModalForCart === 'function') {
        window.openOrderModalForCart(itemsToOrder);
    } else {
        showToast(`Не удалось открыть форму заказа`);
    }
}

// Загрузка истории заказов
async function loadOrders() {
    const container = document.getElementById('orders-container');
    if (!container) return;
    
    if (!isLoggedIn()) {
        container.innerHTML = `
            <div class="empty-orders">
                <i class="fas fa-box-open"></i>
                <p>У вас пока нет заказов</p>
                <a href="catalog.html" class="btn btn-small">Сделать первый заказ</a>
            </div>
        `;
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/?userId=${getUserId()}`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            userOrders = data.orders || [];
        } else {
            userOrders = [];
        }
    } catch(e) {
        console.log('Ошибка загрузки заказов (бекенд не запущен):', e);
        userOrders = [];
    }
    renderOrders();
}

// Отображение истории заказов
function renderOrders() {
    const container = document.getElementById('orders-container');
    if (!container) return;
    
    if (!userOrders.length) {
        container.innerHTML = `
            <div class="empty-orders">
                <i class="fas fa-box-open"></i>
                <p>У вас пока нет заказов</p>
                <a href="catalog.html" class="btn btn-small empty-orders-btn">Сделать первый заказ</a>
            </div>
        `;
        return;
    }
    
    let html = '<div class="orders-list">';
    
    userOrders.forEach(order => {
        let items = order.items || [];
        let totalAmount = order.totalAmount || 0;
        
        if (items.length === 0 && order.productName) {
            items = [{
                productName: order.productName,
                productImage: order.productImage,
                quantity: order.quantity || 1,
                price: order.productPrice || 0
            }];
            totalAmount = (order.productPrice || 0) * (order.quantity || 1);
        }
        
        if (!totalAmount && items.length) {
            totalAmount = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        }
        
        const orderDate = new Date(order.created_at || order.orderDate).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        html += `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <div class="order-header-left">
                        <div class="order-header-item">
                            <span class="order-header-label">Заказ №</span>
                            <span class="order-header-value order-id">${order.id}</span>
                        </div>
                        <div class="order-header-item">
                            <span class="order-header-label">Дата</span>
                            <span class="order-header-value">${orderDate}</span>
                        </div>
                        <div class="order-header-item">
                            <span class="order-header-label">Товаров</span>
                            <span class="order-header-value">${items.length} шт.</span>
                        </div>
                        <div class="order-header-item">
                            <span class="order-header-label">Сумма</span>
                            <span class="order-header-value order-total">${totalAmount.toLocaleString()} ₽</span>
                        </div>
                    </div>
                    <button class="order-toggle" data-order-id="${order.id}">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="order-body" id="order-body-${order.id}">
                    <div class="order-products">
        `;
        
        items.forEach(item => {
            const itemPrice = item.price || 0;
            const itemQuantity = item.quantity || 1;
            const itemTotal = itemPrice * itemQuantity;
            
            html += `
                <div class="order-product">
                    <img class="order-product-image" src="${item.productImage || 'https://i.pinimg.com/736x/97/78/33/9778339cf8a1e1e1851e6b6ed4ce81c6.jpg'}" alt="${escapeHTML(item.productName)}">
                    <div class="order-product-info">
                        <div class="order-product-name">${escapeHTML(item.productName)}</div>
                        <div class="order-product-quantity">Количество: ${itemQuantity}</div>
                        <div class="order-product-price-item">${itemPrice.toLocaleString()} ₽ / шт.</div>
                    </div>
                    <div class="order-product-price">${itemTotal.toLocaleString()} ₽</div>
                </div>
            `;
        });
        
        html += `
                    </div>
                    <div class="order-total">
                        Итого: <span>${totalAmount.toLocaleString()} ₽</span>
                    </div>
                    <div class="order-delivery-info">
                        <div><strong>Доставка:</strong> ${order.address || 'не указан'}</div>
                        <div><strong>Телефон:</strong> ${order.phone || 'не указан'}</div>
                        <div><strong>Имя получателя:</strong> ${order.customerName || order.customer_name || 'не указано'}</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    document.querySelectorAll('.order-toggle').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const orderId = this.dataset.orderId;
            const orderBody = document.getElementById(`order-body-${orderId}`);
            if (orderBody) {
                if (orderBody.style.display === 'none' || !orderBody.style.display) {
                    orderBody.style.display = 'block';
                    this.classList.add('open');
                    this.querySelector('i').style.transform = 'rotate(180deg)';
                } else {
                    orderBody.style.display = 'none';
                    this.classList.remove('open');
                    this.querySelector('i').style.transform = 'rotate(0deg)';
                }
            }
        });
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    console.log('profile.js загружен');
    initTabs();
    loadCart();
    loadOrders();
});