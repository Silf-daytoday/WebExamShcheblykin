class NotificationManager {
    constructor() {
        this.container = document.getElementById('notifications');
        this.notifications = [];
    }

    show(message, type = 'info', duration = 5000) {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Добавляем иконку в зависимости от типа
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-circle';
        
        notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        // Добавляем в контейнер
        this.container.appendChild(notification);
        
        // Сохраняем информацию об уведомлении
        const notificationInfo = {
            element: notification,
            timeout: null
        };
        this.notifications.push(notificationInfo);
        
        // Автоматическое скрытие
        notificationInfo.timeout = setTimeout(() => {
            this.hide(notification);
        }, duration);
        
        // Ручное скрытие по клику
        notification.addEventListener('click', () => {
            this.hide(notification);
        });
        
        // Автоматическое удаление из массива после анимации
        setTimeout(() => {
            const index = this.notifications.findIndex(n => n.element === notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, duration + 300);
    }

    hide(notification) {
        if (!notification.parentNode) return;
        
        // Находим информацию об уведомлении
        const notificationInfo = this.notifications.find(n => n.element === notification);
        if (notificationInfo) {
            clearTimeout(notificationInfo.timeout);
        }
        
        // Анимация скрытия
        notification.style.animation = 'fadeOut 0.3s ease';
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        
        // Удаление из DOM после анимации
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    clearAll() {
        this.notifications.forEach(notificationInfo => {
            this.hide(notificationInfo.element);
        });
        this.notifications = [];
    }
}

// Глобальная функция для показа уведомлений
const notificationManager = new NotificationManager();

function showNotification(message, type = 'info') {
    notificationManager.show(message, type);
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showInfo(message) {
    showNotification(message, 'info');
}