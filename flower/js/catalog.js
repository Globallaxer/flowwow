let allProducts = [];
let cachedFavorites = [];
let cart = [];
let cartCount = 0;


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
        const response = await fetch(`${API_BASE_URL}/products/`);
        if (response.ok) {
            allProducts = await response.json();
            console.log('Загружено товаров:', allProducts.length);
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
        const response = await fetch(`${API_BASE_URL}/favorites/?userId=${getUserId()}`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            cachedFavorites = data.favorites || [];
        }
    } catch(e) {
        cachedFavorites = [];
    }
    return [];
}

async function toggleFavorite(productId) {
    if (!isLoggedIn()) {
        showToast('Войдите в аккаунт');
        return false;
    }
    
    const isFav = cachedFavorites.includes(productId);
    const endpoint = isFav ? `${API_BASE_URL}/favorites/remove/` : `${API_BASE_URL}/favorites/add/`;
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId: getUserId(), productId: productId })
        });
        
        if (response.ok) {
            if (isFav) {
                cachedFavorites = cachedFavorites.filter(id => id !== productId);
            } else {
                cachedFavorites.push(productId);
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
        const response = await fetch(`${API_BASE_URL}/cart/?userId=${getUserId()}`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            cart = data.cart || [];
            cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        }
    } catch(e) {
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
        const response = await fetch(`${API_BASE_URL}/cart/add/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId: getUserId(), productId: product.id, quantity: 1 })
        });
        
        if (response.ok) {
            await loadCart();
            showToast(`${product.name} добавлен в корзину`);
            return true;
        }
    } catch(e) {
        console.error('Ошибка:', e);
    }
    return false;
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
        
        productCard.innerHTML = `
            <div class="product-img" style="background-image: url('${product.image}'); position: relative;">
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
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.preventDefault();
            await toggleFavorite(parseInt(btn.dataset.id));
        };
    });
    
    document.querySelectorAll('.order-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            if (!isLoggedIn()) {
                showToast('Войдите в аккаунт для заказа');
                return;
            }
            const productId = parseInt(btn.dataset.id);
            if (typeof window.openOrderModal === 'function') {
                window.openOrderModal(productId);
            }
        };
    });
    
    document.querySelectorAll('.cart-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.preventDefault();
            const productId = parseInt(btn.dataset.id);
            const product = allProducts.find(p => p.id === productId);
            if (product) await addToCart(product);
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