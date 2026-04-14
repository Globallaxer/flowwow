(async function() {
    // Ждем загрузки функций из catalog.js
    const waitForFunctions = setInterval(() => {
        if (typeof loadFavorites === 'function') {
            clearInterval(waitForFunctions);
            initIndexFavorites();
        }
    }, 100);
    
    async function initIndexFavorites() {
        // Загружаем избранные
        await loadFavorites();
        
        // Обновляем состояние всех кнопок избранного на главной
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            const productId = parseInt(btn.getAttribute('data-id'));
            if (productId && typeof isFavorite === 'function') {
                const isFav = isFavorite(productId);
                if (isFav) {
                    btn.classList.add('active');
                    btn.innerHTML = '<i class="fas fa-heart"></i>';
                }
            }
            
            // Добавляем обработчик клика
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                const productId = parseInt(this.getAttribute('data-id'));
                if (productId && typeof toggleFavorite === 'function') {
                    await toggleFavorite(productId);
                    // После изменения обновляем состояние кнопки
                    const isNowFav = isFavorite(productId);
                    if (isNowFav) {
                        this.classList.add('active');
                        this.innerHTML = '<i class="fas fa-heart"></i>';
                    } else {
                        this.classList.remove('active');
                        this.innerHTML = '<i class="far fa-heart"></i>';
                    }
                }
            });
        });
    }
})();