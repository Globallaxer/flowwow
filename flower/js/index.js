async function loadPopularProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products/popular/`);
        if (response.ok) {
            const products = await response.json();
            displayPopularProducts(products);
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    }
}

function displayPopularProducts(products) {
    const productGrid = document.querySelector('.product-grid');
    if (!productGrid) return;
    
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
            <div class="product-img" style="background-image: url('${product.image}');">
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
            </div>
        `;
        productGrid.appendChild(productCard);
    });
    
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
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

// Ждем загрузки функций из catalog.js
const waitForFunctions = setInterval(() => {
    if (typeof window.isFavorite === 'function') {
        clearInterval(waitForFunctions);
        loadPopularProducts();
    }
}, 100);