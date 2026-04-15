async function loadPopularProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products/`);
        if (response.ok) {
            const allProducts = await response.json();
            const popularProducts = allProducts.filter(product => product.is_popular === true).slice(0, 3);
            displayPopularProducts(popularProducts);
        } else {
            console.error('Ошибка загрузки товаров:', response.status);
            displayPopularProducts([]);
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        displayPopularProducts([]);
    }
}

function displayPopularProducts(products) {
    const productGrid = document.querySelector('.product-grid');
    if (!productGrid) return;
    
    if (!products.length) {
        productGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Популярные товары не найдены</p>';
        return;
    }
    
    productGrid.innerHTML = '';
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        const hasOldPrice = product.old_price ? `<span class="old-price">${product.old_price.toLocaleString()} ₽</span>` : '';
        const rating = product.rating || 5;
        const reviews = product.reviews || 0;
        const isFav = window.isFavorite ? window.isFavorite(product.id) : false;
        
        let badges = '';
        if (product.is_popular) badges += '<span class="product-badge">Хит продаж</span>';
        if (product.is_new) badges += '<span class="product-badge new">Новинка</span>';
        
        productCard.innerHTML = `
            <div class="product-img" style="background-image: url('${product.image || 'https://i.pinimg.com/736x/97/78/33/9778339cf8a1e1e1851e6b6ed4ce81c6.jpg'}');">
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
                    <span class="current-price">${product.price.toLocaleString()} ₽</span>
                    ${hasOldPrice}
                </div>
                <div class="product-buttons">
                    <a href="#" class="btn btn-small order-btn" data-id="${product.id}">Заказать</a>
                    <a href="#" class="btn btn-small cart-btn" data-id="${product.id}">
                        <i class="fas fa-shopping-cart"></i> В корзину
                    </a>
                </div>
            </div>
        `;
        productGrid.appendChild(productCard);
    });
    
    // Обработчики для кнопок избранного
    document.querySelectorAll('.product-grid .wishlist-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.preventDefault();
            if (!window.isLoggedIn || !window.isLoggedIn()) {
                showToast('Войдите в аккаунт');
                return;
            }
            const productId = parseInt(btn.dataset.id);
            if (typeof window.toggleFavorite === 'function') {
                await window.toggleFavorite(productId);
                const isNowFav = window.isFavorite ? window.isFavorite(productId) : false;
                if (isNowFav) {
                    btn.classList.add('active');
                    btn.innerHTML = '<i class="fas fa-heart"></i>';
                } else {
                    btn.classList.remove('active');
                    btn.innerHTML = '<i class="far fa-heart"></i>';
                }
            }
        };
    });
    
    // Обработчики для кнопок заказа
    document.querySelectorAll('.product-grid .order-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            if (!window.isLoggedIn || !window.isLoggedIn()) {
                showToast('Войдите в аккаунт для заказа');
                return;
            }
            const productId = parseInt(btn.dataset.id);
            if (typeof window.openOrderModal === 'function') {
                window.openOrderModal(productId);
            }
        };
    });
    
    // Обработчики для кнопок "В корзину"
    document.querySelectorAll('.product-grid .cart-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.preventDefault();
            if (!window.isLoggedIn || !window.isLoggedIn()) {
                showToast('Войдите в аккаунт');
                return;
            }
            const productId = parseInt(btn.dataset.id);
            const product = products.find(p => p.id === productId);
            if (product && typeof window.addToCart === 'function') {
                await window.addToCart(product);
            }
        };
    });
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

// Ждем загрузки функций из catalog.js
const waitForFunctions = setInterval(() => {
    if (typeof window.isFavorite === 'function' && 
        typeof window.isLoggedIn === 'function' && 
        typeof window.toggleFavorite === 'function' && 
        typeof window.addToCart === 'function' &&
        typeof window.openOrderModal === 'function') {
        clearInterval(waitForFunctions);
        loadPopularProducts();
    }
}, 100);