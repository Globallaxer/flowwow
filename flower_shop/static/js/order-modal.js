// модальное окно для заказа
const modal = document.getElementById('order-modal');
const closeBtn = modal?.querySelector('.modal-close');
const orderForm = document.getElementById('order-form');

if (!modal || !closeBtn || !orderForm) {
    console.error('Элементы модального окна не найдены');
}

// текущий выбранный товар (для одиночного заказа) или массив товаров
let currentProduct = null;
let currentCartItems = null;

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

function showAuthAlert() {
    showToast(`Для оформления заказа необходимо войти в аккаунт`);
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

// открытие модального окна для одного товара
function openOrderModal(productId) {
    console.log('openOrderModal вызван с productId:', productId);
    
    if (!isLoggedIn()) {
        showAuthAlert();
        return;
    }
    
    // Ищем товар в глобальной переменной allProducts
    let product = null;
    
    // Сначала пробуем найти через window.allProducts
    if (window.allProducts && Array.isArray(window.allProducts)) {
        product = window.allProducts.find(p => p.id === productId);
        console.log('Поиск в window.allProducts:', product);
    }
    
    if (!product && window.bouquetsData) {
        const bouquetsData = window.bouquetsData;
        for (const cat in bouquetsData) {
            if (bouquetsData[cat] && bouquetsData[cat].products) {
                product = bouquetsData[cat].products.find(p => p.id === productId);
                if (product) {
                    console.log('Найден в bouquetsData категории:', cat);
                    break;
                }
            }
        }
    }
    
    // Если товар не найден, показываем ошибку
    if (!product) {
        console.error('Товар не найден, productId:', productId);
        showToast('Товар не найден');
        return;
    }
    
    // Сохраняем текущий товар
    currentProduct = product;
    currentCartItems = null;
    
    // Показываем блок для одного товара, скрываем для нескольких
    const singleProductDiv = document.querySelector('.order-single-product');
    const multipleProductsDiv = document.querySelector('.order-multiple-products');
    
    if (singleProductDiv) {
        singleProductDiv.style.display = 'block';
    }
    if (multipleProductsDiv) {
        multipleProductsDiv.style.display = 'none';
    }
    
    // Заполняем данные товара в модальном окне
    const nameEl = document.getElementById('order-product-name');
    const priceEl = document.getElementById('order-product-price');
    const imageEl = document.getElementById('order-product-image');
    const dateEl = document.getElementById('order-date');
    
    if (nameEl) {
        nameEl.textContent = product.name;
    }
    if (priceEl) {
        priceEl.textContent = `${product.price.toLocaleString()} ₽`;
    }
    if (imageEl) {
        imageEl.src = product.image || 'https://i.pinimg.com/736x/97/78/33/9778339cf8a1e1e1851e6b6ed4ce81c6.jpg';
    }
    
    // Устанавливаем дату доставки на завтра
    if (dateEl) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateEl.value = tomorrow.toISOString().split('T')[0];
    }
    
    // Открываем модальное окно
    if (modal) {
        modal.classList.add('active');
    }
}

// открытие модального окна для нескольких товаров (из корзины)
function openOrderModalForCart(items) {
    console.log('openOrderModalForCart вызван с items:', items);
    
    if (!isLoggedIn()) {
        showAuthAlert();
        return;
    }
    
    if (!items || items.length === 0) {
        showToast(`Нет товаров для оформления заказа`);
        return;
    }
    
    currentCartItems = items;
    currentProduct = null;
    
    // Показываем список товаров
    const singleProductDiv = document.querySelector('.order-single-product');
    const multipleProductsDiv = document.querySelector('.order-multiple-products');
    if (singleProductDiv) singleProductDiv.style.display = 'none';
    if (multipleProductsDiv) multipleProductsDiv.style.display = 'block';
    
    // Заполняем список товаров
    const itemsContainer = document.getElementById('order-items-list');
    let totalAmount = 0;
    
    if (itemsContainer) {
        itemsContainer.innerHTML = '';
        
        items.forEach(item => {
            const quantity = item.quantity || 1;
            const itemTotal = (item.price || 0) * quantity;
            totalAmount += itemTotal;
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'order-cart-item';
            itemDiv.innerHTML = `
                <img class="order-cart-item-image" src="${item.image || 'https://i.pinimg.com/736x/97/78/33/9778339cf8a1e1e1851e6b6ed4ce81c6.jpg'}" alt="${escapeHTML(item.name)}">
                <div class="order-cart-item-info">
                    <div class="order-cart-item-name">${escapeHTML(item.name)}</div>
                    <div class="order-cart-item-price">${(item.price || 0).toLocaleString()} ₽ × ${quantity}</div>
                </div>
                <div class="order-cart-item-total">${itemTotal.toLocaleString()} ₽</div>
            `;
            itemsContainer.appendChild(itemDiv);
        });
    }
    
    const totalEl = document.getElementById('order-cart-total');
    if (totalEl) totalEl.textContent = totalAmount.toLocaleString();
    
    modal.classList.add('active');
}

function closeOrderModal() {
    modal.classList.remove('active');
    if (orderForm) orderForm.reset();
    currentProduct = null;
    currentCartItems = null;
}

if (closeBtn) {
    closeBtn.addEventListener('click', closeOrderModal);
}

if (modal) {
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeOrderModal();
        }
    });
}

// отправка формы
if (orderForm) {
    orderForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!isLoggedIn()) {
            showAuthAlert();
            closeOrderModal();
            return;
        }
        
        const name = document.getElementById('order-name')?.value;
        const phone = document.getElementById('order-phone')?.value;
        const address = document.getElementById('order-address')?.value;
        
        if (!name || !phone || !address) {
            showToast(`Заполните все обязательные поля`);
            return;
        }
        
        let items = [];
        let totalAmount = 0;
        
        if (currentCartItems && currentCartItems.length > 0) {
            // Заказ из корзины (несколько товаров)
            items = currentCartItems.map(item => ({
                productId: item.id,
                productName: item.name,
                productImage: item.image,
                price: item.price,
                quantity: item.quantity || 1
            }));
            totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        } else if (currentProduct) {
            // Заказ одного товара
            items = [{
                productId: currentProduct.id,
                productName: currentProduct.name,
                productImage: currentProduct.image,
                price: currentProduct.price,
                quantity: 1
            }];
            totalAmount = currentProduct.price;
        } else {
            showToast(`Нет товаров для оформления`);
            return;
        }
        
        const orderData = {
            userId: getUserId(),
            items: items,
            customerName: name,
            phone: phone,
            email: document.getElementById('order-email')?.value || '',
            address: address,
            deliveryDate: document.getElementById('order-date')?.value || new Date(Date.now() + 86400000).toISOString().split('T')[0],
            comment: document.getElementById('order-comment')?.value || '',
            orderDate: new Date().toISOString(),
            totalAmount: totalAmount
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/orders/`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(orderData)
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Если заказ из корзины, удаляем заказанные товары
                if (currentCartItems && currentCartItems.length > 0) {
                    for (const item of currentCartItems) {
                        await fetch(`${API_BASE_URL}/cart/remove/`, {
                            method: 'POST',
                            headers: getHeaders(),
                            body: JSON.stringify({
                                userId: getUserId(),
                                productId: item.id
                            })
                        });
                    }
                }
                
                const itemsText = items.map(i => `${i.productName} x${i.quantity}`).join(', ');
                showToast(`Спасибо, ${name}! Заказ №${result.order_id || 'создан'} на "${itemsText}" принят. Наш менеджер свяжется с вами.`);
                closeOrderModal();
                
                // Обновляем страницу, если мы на profile.html
                if (window.location.pathname.includes('profile.html')) {
                    window.location.reload();
                }
            } else {
                const error = await response.json();
                showToast(` Ошибка: ${error.message || error.error || 'Попробуйте позже'}`);showToast(``);
            }
        } catch(error) {
            console.error('Ошибка:', error);
            showToast(`Произошла ошибка`);
        }
    });
}

// делаем функции глобальными
window.openOrderModal = openOrderModal;
window.openOrderModalForCart = openOrderModalForCart;

console.log('order-modal.js загружен');