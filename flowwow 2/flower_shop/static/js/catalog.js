let allProducts = [];
let cachedFavorites = [];
let cart = [];
let cartCount = 0;

// получение CSRF токена
async function getCsrfToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/csrf/`, {
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

function isLoggedIn() {
    return !!localStorage.getItem('auth_token');
}

function getUserId() {
    const token = localStorage.getItem('auth_token');
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
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
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

function showToast(message) {
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

function getUrlParameter(name) {
    const regex = new RegExp('[?&]' + name + '=([^&#]*)');
    const results = regex.exec(window.location.href);
    return results ? decodeURIComponent(results[1]) : null;
}

// Загрузка товаров из бд
async function loadProductsFromDB() {
    try {
        console.log('Loading products from:', `${API_BASE_URL}/products/`);
        const response = await fetch(`${API_BASE_URL}/products/`);
        console.log('Products response status:', response.status);
        
        if (response.ok) {
            allProducts = await response.json();
            console.log('Загружено товаров:', allProducts.length);
            
            // Сохраняем в глобальную переменную
            window.allProducts = allProducts;
            window.bouquetsData = { all: { products: allProducts } };
            
            // Сохраняем в localStorage для доступа из других скриптов
            localStorage.setItem('all_products', JSON.stringify(allProducts));
            
            return true;
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    }
    return false;
}

// Избранное
async function loadFavorites() {
    if (!isLoggedIn()) {
        cachedFavorites = [];
        return [];
    }
    try {
        const csrfToken = await getCsrfToken();
        const response = await fetch(`${API_BASE_URL}/favorites/my-favorites/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'X-CSRFToken': csrfToken
            },
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            cachedFavorites = data.favorites || [];
        }
    } catch(e) {
        console.error('Error loading favorites:', e);
        cachedFavorites = [];
    }
    return cachedFavorites;
}

async function toggleFavorite(productId) {
    if (!isLoggedIn()) {
        showToast('Войдите в аккаунт');
        return false;
    }
    
    const isFav = cachedFavorites.includes(productId);
    const endpoint = isFav ? `${API_BASE_URL}/favorites/remove/` : `${API_BASE_URL}/favorites/add/`;
    
    try {
        const csrfToken = await getCsrfToken();
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'X-CSRFToken': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({ productId: productId })
        });
        
        if (response.ok) {
            if (isFav) {
                cachedFavorites = cachedFavorites.filter(id => id !== productId);
                showToast('Удалено из избранного');
            } else {
                cachedFavorites.push(productId);
                showToast('Добавлено в избранное');
            }
            updateWishlistButton(productId, !isFav);
            return true;
        }
    } catch(e) {
        console.error('Ошибка:', e);
    }
    return false;
}

function isFavorite(productId) {
    return cachedFavorites.includes(productId);
}

function updateWishlistButton(productId, isFav) {
    const btn = document.querySelector(`.wishlist-btn[data-id="${productId}"]`);
    if (btn) {
        btn.classList.toggle('active', isFav);
        btn.innerHTML = `<i class="${isFav ? 'fas' : 'far'} fa-heart"></i>`;
    }
}

// Корзина
async function loadCart() {
    if (!isLoggedIn()) {
        cart = [];
        cartCount = 0;
        return;
    }
    
    try {
        const csrfToken = await getCsrfToken();
        const response = await fetch(`${API_BASE_URL}/cart/my-cart/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'X-CSRFToken': csrfToken
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            cart = data.cart || data.items || [];
            cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        }
    } catch(e) {
        console.error('Error loading cart:', e);
        cart = [];
        cartCount = 0;
    }
}

async function addToCart(product) {
    if (!isLoggedIn()) {
        showToast('Войдите в аккаунт');
        return false;
    }
    
    try {
        const csrfToken = await getCsrfToken();
        
        const response = await fetch(`${API_BASE_URL}/cart/add/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'X-CSRFToken': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({ 
                productId: product.id, 
                quantity: 1 
            })
        });
        
        if (response.ok) {
            await loadCart();
            showToast(`${product.name} добавлен в корзину`);
            return true;
        } else {
            const error = await response.json();
            showToast(error.error || 'Ошибка добавления в корзину');
            return false;
        }
    } catch(e) {
        console.error('Ошибка:', e);
        showToast('Ошибка соединения');
        return false;
    }
}

// Прямое открытие модального окна заказа (без фото)
function openOrderModalDirect(product) {
    console.log('openOrderModalDirect вызван для товара:', product);
    
    let modal = document.getElementById('order-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'order-modal';
        modal.className = 'modal order-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close"><i class="fas fa-times"></i></button>
                <div class="modal-body">
                    <h2 class="order-modal-title">Оформление заказа</h2>
                    <form id="order-form-direct" class="order-form">
                        <div class="order-form-field">
                            <label class="order-form-label">Ваше имя *</label>
                            <input type="text" id="order-name" class="order-form-input" required maxlength="50">
                        </div>
                        <div class="order-form-field">
                            <label class="order-form-label">Телефон *</label>
                            <input type="tel" id="order-phone" class="order-form-input" required placeholder="+7 (___) ___-__-__">
                        </div>
                        <div class="order-form-field">
                            <label class="order-form-label">Email</label>
                            <input type="email" id="order-email" class="order-form-input">
                        </div>
                        <div class="order-form-field">
                            <label class="order-form-label">Адрес доставки *</label>
                            <input type="text" id="order-address" class="order-form-input" required>
                        </div>
                        <div class="order-form-field">
                            <label class="order-form-label">Дата доставки</label>
                            <input type="date" id="order-date" class="order-form-input">
                        </div>
                        <div class="order-form-field">
                            <label class="order-form-label">Комментарий к заказу</label>
                            <textarea id="order-comment" class="order-form-textarea" rows="3"></textarea>
                        </div>
                        <div class="order-single-product">
                            <div class="order-product-info">
                                <h4 class="order-product-title">Ваш букет:</h4>
                                <div class="order-product-details">
                                    <div>
                                        <p id="order-product-name" class="order-product-name"></p>
                                        <p id="order-product-price" class="order-product-price"></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button type="submit" class="btn order-submit-btn">Подтвердить заказ</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => modal.classList.remove('active');
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
        
        const form = document.getElementById('order-form-direct');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                await sendOrderDirect(product);
            };
        }
    }
    
    // Обновляем данные товара в модальном окне (без фото)
    const productName = modal.querySelector('#order-product-name');
    const productPrice = modal.querySelector('#order-product-price');
    
    if (productName) productName.textContent = product.name;
    if (productPrice) productPrice.textContent = `${product.price.toLocaleString()} ₽`;
    
    const dateInput = modal.querySelector('#order-date');
    if (dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.value = tomorrow.toISOString().split('T')[0];
    }
    
    modal.classList.add('active');
}

// Отправка заказа напрямую
async function sendOrderDirect(product) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        showToast('Войдите в аккаунт');
        return;
    }
    
    const name = document.getElementById('order-name')?.value;
    const phone = document.getElementById('order-phone')?.value;
    const address = document.getElementById('order-address')?.value;
    const email = document.getElementById('order-email')?.value;
    const deliveryDate = document.getElementById('order-date')?.value;
    const comment = document.getElementById('order-comment')?.value;
    
    if (!name || !phone || !address) {
        showToast('Заполните обязательные поля');
        return;
    }
    
    const orderData = {
        items: [{
            productId: product.id,
            quantity: 1
        }],
        customerName: name,
        phone: phone,
        email: email,
        address: address,
        deliveryDate: deliveryDate,
        comment: comment,
        clear_cart: false
    };
    
    try {
        const csrfToken = await getCsrfToken();
        const response = await fetch(`${API_BASE_URL}/orders/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-CSRFToken': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            showToast('Заказ успешно оформлен!');
            const modal = document.getElementById('order-modal');
            if (modal) modal.classList.remove('active');
        } else {
            const error = await response.json();
            showToast(error.error || 'Ошибка оформления заказа');
        }
    } catch(error) {
        console.error('Order error:', error);
        showToast('Ошибка соединения');
    }
}

// Открытие модального окна авторизации
function openAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.classList.add('active');
    }
}

// Отображение карточек
function displayBouquets(category) {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) return;
    
    productsContainer.innerHTML = '';
    
    let productsToShow = allProducts;
    
    if (category && category !== 'all') {
        productsToShow = allProducts.filter(p => p.category_slug === category || p.category === category);
    }
    
    if (productsToShow.length === 0) {
        productsContainer.innerHTML = '<p style="text-align:center; padding:40px;">Товары не найдены</p>';
        return;
    }
    
    productsToShow.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        const isFav = isFavorite(product.id);
        const safePrice = product.price.toLocaleString();
        const safeOldPrice = product.old_price ? product.old_price.toLocaleString() : '';
        const rating = product.rating || 5;
        const reviews = product.reviews || 0;
        
        let badges = '';
        if (product.is_popular) badges += '<span class="product-badge">Хит продаж</span>';
        if (product.is_new) badges += '<span class="product-badge new">Новинка</span>';
        
        productCard.innerHTML = `
            <div class="product-img" style="background-image: url('${product.image || 'https://i.pinimg.com/736x/97/78/33/9778339cf8a1e1e1851e6b6ed4ce81c6.jpg'}'); position: relative;">
                ${badges}
                <button class="wishlist-btn ${isFav ? 'active' : ''}" data-id="${product.id}">
                    <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
            <div class="product-info">
                <h3>${escapeHTML(product.name)}</h3>
                <p>${escapeHTML(product.description)}</p>
                <div class="product-rating">
                    ${'<i class="fas fa-star"></i>'.repeat(Math.floor(rating))}
                    ${rating % 1 ? '<i class="fas fa-star-half-alt"></i>' : ''}
                    ${'<i class="far fa-star"></i>'.repeat(5 - Math.ceil(rating))}
                    <span>(${reviews})</span>
                </div>
                <div class="product-price">
                    <span class="current-price">${safePrice} ₽</span>
                    ${safeOldPrice ? `<span class="old-price">${safeOldPrice} ₽</span>` : ''}
                </div>
                <div class="product-buttons">
                    <a href="#" class="btn btn-small order-btn" data-id="${product.id}">Заказать</a>
                    <a href="#" class="btn btn-small cart-btn" data-id="${product.id}">
                        <i class="fas fa-shopping-cart"></i> В корзину
                    </a>
                </div>
            </div>
        `;
        productsContainer.appendChild(productCard);
    });
    
    attachEventHandlers();
}

function attachEventHandlers() {
    // Кнопки избранного
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const productId = parseInt(btn.dataset.id);
            await toggleFavorite(productId);
        };
    });
    
    // Кнопки заказа - открывают форму заказа
    document.querySelectorAll('.order-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!isLoggedIn()) {
                showToast('Войдите в аккаунт для заказа');
                openAuthModal();
                return;
            }
            
            const productId = parseInt(btn.dataset.id);
            
            // Ищем товар в allProducts
            let product = allProducts.find(p => p.id === productId);
            
            // Если не нашли, пробуем через глобальный объект
            if (!product && window.allProducts) {
                product = window.allProducts.find(p => p.id === productId);
            }
            
            // Если все еще не нашли, пробуем через bouquetsData
            if (!product && window.bouquetsData) {
                for (const cat in window.bouquetsData) {
                    if (window.bouquetsData[cat] && window.bouquetsData[cat].products) {
                        product = window.bouquetsData[cat].products.find(p => p.id === productId);
                        if (product) break;
                    }
                }
            }
            
            if (product) {
                // Пытаемся использовать глобальную функцию из order-modal.js
                if (typeof window.openOrderModal === 'function') {
                    window.openOrderModal(productId);
                } else {
                    openOrderModalDirect(product);
                }
            } else {
                showToast('Товар не найден');
                console.error('Product not found for ID:', productId);
            }
        };
    });
    
    // Кнопки "В корзину"
    document.querySelectorAll('.cart-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!isLoggedIn()) {
                showToast('Войдите в аккаунт');
                return;
            }
            
            const productId = parseInt(btn.dataset.id);
            const product = allProducts.find(p => p.id === productId);
            
            if (product) {
                await addToCart(product);
            } else {
                showToast('Товар не найден');
            }
        };
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', async function() {
    await loadProductsFromDB();
    await loadFavorites();
    await loadCart();
    
    const filterTabs = document.querySelectorAll('.filter-tab');
    const categoryFromUrl = getUrlParameter('cat');
    let activeCategory = 'all';
    
    if (categoryFromUrl) {
        activeCategory = categoryFromUrl;
    }
    
    filterTabs.forEach(btn => {
        const btnCategory = btn.getAttribute('data-category');
        if (btnCategory === activeCategory) {
            btn.classList.add('active');
        }
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            filterTabs.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            displayBouquets(this.getAttribute('data-category'));
        });
    });
    
    displayBouquets(activeCategory);
});

// Глобальные функции
window.bouquetsData = { all: { products: allProducts } };
window.allProducts = allProducts;
window.isLoggedIn = isLoggedIn;
window.toggleFavorite = toggleFavorite;
window.isFavorite = isFavorite;
window.addToCart = addToCart;
window.loadCart = loadCart;
window.getCsrfToken = getCsrfToken;
window.openOrderModalDirect = openOrderModalDirect;