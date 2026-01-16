// Общие вспомогательные функции

class Utils {
    static formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static formatPrice(price) {
        if (!price) return '0';
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    static truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validatePhone(phone) {
        const re = /^\+7\d{10}$/;
        return re.test(phone.replace(/\s|-|\(|\)/g, ''));
    }

    static getCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        return [...new Set(cart)].length; // Уникальные товары
    }

    static updateCartBadge() {
        const count = this.getCartCount();
        const badges = document.querySelectorAll('.badge, .mobile-badge');
        
        badges.forEach(badge => {
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }
        });
    }

    // Удаление дубликатов из массива объектов по ключу
    static removeDuplicates(array, key = 'id') {
        const seen = new Set();
        return array.filter(item => {
            const value = item[key];
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    }

    // Группировка товаров по ID для корзины
    static groupCartItems(cartArray) {
        const groups = {};
        cartArray.forEach(id => {
            if (!groups[id]) {
                groups[id] = 0;
            }
            groups[id]++;
        });
        return groups;
    }

    // Показать уведомление
    static showNotification(message, type = 'info', elementId = null) {
        // Используем глобальную систему уведомлений если она есть
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else if (elementId) {
            // Или создаем уведомление в указанном элементе
            const container = document.getElementById(elementId);
            if (container) {
                const notification = document.createElement('div');
                notification.className = `catalog-notification ${type}`;
                notification.textContent = message;
                
                container.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 3000);
            }
        } else {
            console.log(`${type}: ${message}`);
        }
    }
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}