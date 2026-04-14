// Данные о букетах
const bouquetsData = {
    wedding: {
        title: "Свадебные букеты",
        description: "Идеальные букеты для вашего особенного дня.",
        products: [
            {
                id: 1,
                name: "Невеста",
                description: "Белые пионы, розы, эвкалипт",
                price: 5000,
                image: "https://i.pinimg.com/736x/b2/96/77/b2967780076aac925b6c4a7398be6788.jpg",
                rating: 5,
                reviews: 12
            },
            {
                id: 2,
                name: "Элегантность",
                description: "Белые розы, гортензии",
                price: 4200,
                image: "https://i.pinimg.com/736x/c4/ae/f0/c4aef06a3a32c70ce1ed75271ab1d3e5.jpg",
                rating: 4,
                reviews: 8
            }
        ]
    },
    birthday: {
        products: [
            {
                id: 4,
                name: "Радость",
                description: "Яркие герберы и хризантемы",
                price: 3200,
                image: "https://i.pinimg.com/736x/c3/e2/60/c3e26031a5be296b2db4df0cbe002d74.jpg",
                rating: 4,
                reviews: 7
            },
            {
                id: 5,
                name: "Праздник",
                description: "Ранункулюсы, тюльпаны и гиацинты",
                price: 4800,
                image: "https://i.pinimg.com/736x/1b/d5/bc/1bd5bca8f6efdfcee2b1c03e0906dc40.jpg",
                rating: 5,
                reviews: 10
            }
        ]
    },
    romantic: {
        products: [
            {
                id: 6,
                name: "Любимой",
                description: "Красные розы, гипсофила",
                price: 3200,
                image: "https://i.pinimg.com/736x/03/93/d7/0393d78272a9a765b7520dcb59154c57.jpg",
                rating: 5,
                reviews: 24
            },
            {
                id: 7,
                name: "Нежность",
                description: "Розы, пионы, эвкалипт",
                price: 3500,
                image: "https://i.pinimg.com/736x/1a/4f/69/1a4f691a708ad3a6c7a5681aa8a183e4.jpg",
                rating: 4,
                reviews: 18
            },
            {
                id: 3,
                name: "Романтический букет",
                description: "Нежные розы и пионы в элегантной упаковке",
                price: 3500,
                oldPrice: 4200,
                image: "https://i.pinimg.com/736x/97/78/33/9778339cf8a1e1e1851e6b6ed4ce81c6.jpg",
                rating: 4.5,
                reviews: 24
            }
        ]
    },
    business: {
        products: [
            {
                id: 12,
                name: "Королевский",
                description: "Орхидеи, розы, каллы",
                price: 6500,
                image: "https://i.pinimg.com/736x/f9/33/bb/f933bbe990be5869572403ecf0b7b10f.jpg",
                rating: 5,
                reviews: 6
            }
        ]
    },
    spring: {
        products: [
            {
                id: 10,
                name: "Весеннее настроение",
                description: "Яркие тюльпаны и гиацинты в корзине",
                price: 2800,
                image: "https://i.pinimg.com/736x/48/8b/9b/488b9b95779fdf4cf9a10121874ee0e2.jpg",
                rating: 4,
                reviews: 18
            }
        ]
    }
};


const API_URLS = {
    favorites: {
        get: `/api/favorites/`,
        add: `/api/favorites/add/`,
        remove: `/api/favorites/remove/`
    },
    cart: {
        get: `/api/cart/`,
        add: `/api/cart/add/`,
        remove: `/api/cart/remove/`,
        update: `/api/cart/update/`
    }
};


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

function showAuthAlert(message = 'Войдите в аккаунт для добавления в избранное') {
    showToast(message);
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

function getUrlParameter(name) {
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    const results = regex.exec(window.location.href);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}


let cachedFavorites = [];

async function loadFavorites() {
    if (!isLoggedIn()) {
        cachedFavorites = [];
        return [];
    }
    
    try {
        const response = await fetch(`${API_URLS.favorites.get}?userId=${getUserId()}`, { 
            headers: getHeaders() 
        });
        if (response.ok) {
            const data = await response.json();
            cachedFavorites = data.favorites || [];
        }
    } catch(e) { 
        console.warn('Не удалось загрузить избранное:', e);
        cachedFavorites = [];
    }
    return [];
}

async function toggleFavorite(productId) {
    if (!isLoggedIn()) {
        showAuthAlert();
        return false;
    }
    
    const isFav = cachedFavorites.includes(productId);
    const endpoint = isFav ? API_URLS.favorites.remove : API_URLS.favorites.add;
    
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
            
            const btn = document.querySelector(`.wishlist-btn[data-id="${productId}"]`);
            if (btn) {
                const isNowFav = cachedFavorites.includes(productId);
                btn.classList.toggle('active', isNowFav);
                btn.innerHTML = `<i class="${isNowFav ? 'fas' : 'far'} fa-heart"></i>`;
            }
            return true;
        }
    } catch(e) { 
        console.error('Ошибка переключения избранного:', e);
    }
    return false;
}

function isFavorite(productId) {
    return cachedFavorites.includes(productId);
}

// Корзина

let cart = [];
let cartCount = 0;

// Загрузка корзины с сервера
async function loadCart() {
    if (!isLoggedIn()) {
        cart = [];
        cartCount = 0;
        updateCartCount();
        return;
    }
    
    try {
        const response = await fetch(`${API_URLS.cart.get}?userId=${getUserId()}`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            cart = data.cart || [];
            cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            updateCartCount();
        }
    } catch(e) {
        console.warn('Не удалось загрузить корзину:', e);
        cart = [];
        cartCount = 0;
    }
}

// Обновление счетчика корзины
function updateCartCount() {
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(el => {
        if (el) el.textContent = cartCount;
    });
}

// Добавление товара в корзину
async function addToCart(product) {
    if (!isLoggedIn()) {
        showAuthAlert('Войдите в аккаунт, чтобы добавить товар в корзину');
        return false;
    }
    
    try {
        const response = await fetch(API_URLS.cart.add, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ 
                userId: getUserId(), 
                productId: product.id,
                quantity: 1 
            })
        });
        
        if (response.ok) {
            await loadCart();
            showCartNotification(product.name);
            return true;
        } else {
            showToast(`Не удалось добавить товар в корзину`);
            return false;
        }
    } catch(e) {
        console.error('Ошибка добавления в корзину:', e);
        showToast(`Ошибка соединения`);
        return false;
    }
}

// Уведомление о добавлении в корзину
function showCartNotification(productName) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.innerHTML = `
        <i class="fas fa-shopping-cart"></i>
        <span>${escapeHTML(productName)} добавлен в корзину!</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 2000);
}

// Отображение карточек

function displayBouquets(category) {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) {
        console.error('Контейнер products-container не найден!');
        return;
    }
    
    productsContainer.innerHTML = '';
    
    let productsToShow = [];

    if (category === 'all') {
        for (const cat in bouquetsData) {
            if (bouquetsData[cat].products) {
                productsToShow = [...productsToShow, ...bouquetsData[cat].products];
            }
        }
    } else if (bouquetsData[category] && bouquetsData[category].products) {
        productsToShow = bouquetsData[category].products;
    }

    console.log('Показываем товаров:', productsToShow.length);

    productsToShow.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';

        const safeName = escapeHTML(product.name);
        const safeDescription = escapeHTML(product.description);
        const safeImage = escapeHTML(product.image);
        const safePrice = product.price.toLocaleString();
        const safeOldPrice = product.oldPrice ? product.oldPrice.toLocaleString() : '';
        const safeRating = product.rating || 5;
        const safeReviews = product.reviews || 0;
        const isFav = isFavorite(product.id);

        productCard.innerHTML = `
            <div class="product-img" style="background-image: url('${safeImage}'); position: relative;">
                <button class="wishlist-btn ${isFav ? 'active' : ''}" data-id="${product.id}">
                    <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
            <div class="product-info">
                <h3>${safeName}</h3>
                <p>${safeDescription}</p>
                <div class="product-rating">
                    ${'<i class="fas fa-star"></i>'.repeat(Math.floor(safeRating))}
                    ${safeRating % 1 ? '<i class="fas fa-star-half-alt"></i>' : ''}
                    ${'<i class="far fa-star"></i>'.repeat(5 - Math.ceil(safeRating))}
                    <span>(${safeReviews})</span>
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

    // Обработчики для кнопок избранного
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            const productId = parseInt(this.getAttribute('data-id'));
            await toggleFavorite(productId);
        });
    });
    
    // Обработчики для кнопок заказа
    document.querySelectorAll('.order-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (!isLoggedIn()) {
                showAuthAlert('Для оформления заказа необходимо войти в аккаунт');
                return;
            }
            
            const productId = parseInt(this.getAttribute('data-id'));
            
            let product = null;
            for (const cat in bouquetsData) {
                if (bouquetsData[cat].products) {
                    product = bouquetsData[cat].products.find(p => p.id === productId);
                    if (product) break;
                }
            }
            
            if (product && typeof window.openOrderModal === 'function') {
                window.openOrderModal(productId);
            }
        });
    });
    
    // Обработчики для кнопок "В корзину"
    document.querySelectorAll('.cart-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const productId = parseInt(this.getAttribute('data-id'));
            
            let product = null;
            for (const cat in bouquetsData) {
                if (bouquetsData[cat].products) {
                    product = bouquetsData[cat].products.find(p => p.id === productId);
                    if (product) break;
                }
            }
            
            if (product) {
                await addToCart(product);
            }
        });
    });
}

// Инициализация

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM загружен');
    
    const filterTabs = document.querySelectorAll('.filter-tab');
    const productsContainer = document.getElementById('products-container');

    console.log('filterTabs найдено:', filterTabs.length);
    console.log('productsContainer найден:', !!productsContainer);

    if (!filterTabs.length || !productsContainer) return;

    // Загружаем избранное и корзину
    try {
        await loadFavorites();
        await loadCart();
    } catch(e) {
        console.warn('Ошибка загрузки данных');
    }

    const categoryFromUrl = getUrlParameter('cat');
    let activeCategory = 'all';

    if (categoryFromUrl && bouquetsData[categoryFromUrl]) {
        activeCategory = categoryFromUrl;
    }

    filterTabs.forEach(btn => {
        const btnCategory = btn.getAttribute('data-category');
        if (btnCategory === activeCategory) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    filterTabs.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            filterTabs.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const category = this.getAttribute('data-category');
            displayBouquets(category);
        });
    });

    // Отображаем товары
    displayBouquets(activeCategory);
});

// Глобальные функции
window.bouquetsData = bouquetsData;
window.isLoggedIn = isLoggedIn;
window.showAuthAlert = showAuthAlert;
window.toggleFavorite = toggleFavorite;
window.isFavorite = isFavorite;
window.addToCart = addToCart;
window.loadCart = loadCart;