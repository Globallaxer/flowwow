function showToast(message) {
    // Удаляем старые уведомления (не больше 3 на экране)
    const existingToasts = document.querySelectorAll('.toast-notification');
    if (existingToasts.length >= 3) {
        existingToasts[0].remove();
    }
    
    // Создаем элемент уведомления
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    
    // Добавляем на страницу
    document.body.appendChild(toast);
    
    // Автоматическое закрытие через 3 секунды
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 300);
        }
    }, 3000);
}
document.addEventListener('DOMContentLoaded', function() {    
    // Плавная прокрутка для якорных ссылок
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Подсветка активного пункта меню
    const navLinks = document.querySelectorAll('.nav-main a');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop();
        if (linkPage === currentPage) {
            link.style.color = '#e83e8c';
            link.style.fontWeight = 'bold';
        }
    });
});