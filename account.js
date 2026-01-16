class Account {
    constructor() {
        this.orders = [];
        this.goodsInfo = new Map(); // Кэш информации о товарах
        this.currentOrderId = null;
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.setupMobileMenu();
        this.setupModalEvents();
        this.loadOrders();
    }

    cacheElements() {
        this.ordersBody = document.getElementById('orders-body');
        this.emptyOrders = document.getElementById('empty-orders');
        this.ordersLoading = document.getElementById('orders-loading');
        this.refreshBtn = document.getElementById('refresh-orders');
        
        this.viewModal = document.getElementById('view-modal');
        this.editModal = document.getElementById('edit-modal');
        this.deleteModal = document.getElementById('delete-modal');
        this.viewOrderDetails = document.getElementById('view-order-details');
        this.editOrderForm = document.getElementById('edit-order-form');
        this.confirmDeleteBtn = document.getElementById('confirm-delete');
    }

    bindEvents() {
        this.refreshBtn.addEventListener('click', () => this.loadOrders());
    }

    setupMobileMenu() {
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const mobileMenu = document.querySelector('.mobile-menu');
        
        if (menuBtn && mobileMenu) {
            menuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('active');
            });
            
            document.querySelectorAll('.mobile-menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    mobileMenu.classList.remove('active');
                });
            });
        }
    }

    setupModalEvents() {
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        this.editOrderForm.addEventListener('submit', (e) => this.handleEditSubmit(e));
        this.confirmDeleteBtn.addEventListener('click', () => this.handleDelete());
        
        const editPhone = document.getElementById('edit-phone');
        editPhone.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length > 0) {
                value = '+7' + value.substring(1);
            }
            
            if (value.length > 2) {
                value = value.substring(0, 2) + ' ' + value.substring(2);
            }
            if (value.length > 6) {
                value = value.substring(0, 6) + ' ' + value.substring(6);
            }
            if (value.length > 10) {
                value = value.substring(0, 10) + '-' + value.substring(10);
            }
            if (value.length > 13) {
                value = value.substring(0, 13) + '-' + value.substring(13);
            }
            if (value.length > 16) {
                value = value.substring(0, 16);
            }
            
            e.target.value = value;
        });
    }

    async loadOrders() {
        this.showLoading(true);
        
        try {
            this.orders = await api.getOrders();
            
            // Загружаем информацию о товарах для всех заказов
            await this.loadGoodsForAllOrders();
            
            this.renderOrders();
        } catch (error) {
            console.error('Error loading orders:', error);
            showError(`Ошибка загрузки заказов: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async loadGoodsForAllOrders() {
        // Собираем все уникальные ID товаров из всех заказов
        const allGoodIds = new Set();
        this.orders.forEach(order => {
            if (order.good_ids && Array.isArray(order.good_ids)) {
                order.good_ids.forEach(id => allGoodIds.add(id));
            }
        });
        
        // Загружаем информацию о каждом товаре
        const goodsArray = Array.from(allGoodIds);
        const goodsInfoPromises = goodsArray.map(async (id) => {
            try {
                const good = await api.getGood(id);
                if (good && good.name) {
                    this.goodsInfo.set(id, good.name);
                } else {
                    this.goodsInfo.set(id, `Товар #${id}`);
                }
            } catch (error) {
                console.error(`Error loading good ${id}:`, error);
                this.goodsInfo.set(id, `Товар #${id}`);
            }
        });
        
        await Promise.all(goodsInfoPromises);
    }

    async loadGoodsForOrder(order) {
        const goodsNames = [];
        
        if (order.good_ids && Array.isArray(order.good_ids)) {
            for (const id of order.good_ids) {
                if (this.goodsInfo.has(id)) {
                    goodsNames.push(this.goodsInfo.get(id));
                } else {
                    try {
                        const good = await api.getGood(id);
                        const name = good && good.name ? good.name : `Товар #${id}`;
                        this.goodsInfo.set(id, name);
                        goodsNames.push(name);
                    } catch (error) {
                        console.error(`Error loading good ${id}:`, error);
                        goodsNames.push(`Товар #${id}`);
                    }
                }
            }
        }
        
        return goodsNames;
    }

    renderOrders() {
        if (!this.orders || this.orders.length === 0) {
            this.showEmptyOrders();
            return;
        }
        
        this.emptyOrders.style.display = 'none';
        
        this.ordersBody.innerHTML = this.orders.map((order, index) => {
            const orderDate = new Date(order.created_at);
            const deliveryDate = new Date(order.delivery_date);
            
            const orderDateStr = orderDate.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const deliveryDateStr = deliveryDate.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            const orderTotal = this.calculateOrderTotal(order);
            
            // Получаем названия товаров для этого заказа
            const goodsNames = [];
            if (order.good_ids && Array.isArray(order.good_ids)) {
                order.good_ids.forEach(id => {
                    const name = this.goodsInfo.get(id) || `Товар #${id}`;
                    goodsNames.push(name);
                });
            }
            
            return `
                <tr data-id="${order.id}">
                    <td class="order-number">${index + 1}</td>
                    <td class="order-date">${orderDateStr}</td>
                    <td class="order-items">
                        <div class="order-items-list">
                            ${goodsNames.map(name => 
                                `<span class="order-item" title="${name}">${this.truncateText(name, 30)}</span>`
                            ).join('')}
                        </div>
                    </td>
                    <td class="order-total">${this.formatPrice(orderTotal)} ₽</td>
                    <td class="order-delivery">
                        ${deliveryDateStr}<br>
                        ${order.delivery_interval}
                    </td>
                    <td>
                        <div class="order-actions">
                            <button class="action-btn view" data-id="${order.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" data-id="${order.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" data-id="${order.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        this.addActionHandlers();
    }

    addActionHandlers() {
        this.ordersBody.querySelectorAll('.action-btn.view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = parseInt(e.currentTarget.dataset.id);
                this.openViewModal(orderId);
            });
        });
        
        this.ordersBody.querySelectorAll('.action-btn.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = parseInt(e.currentTarget.dataset.id);
                this.openEditModal(orderId);
            });
        });
        
        this.ordersBody.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = parseInt(e.currentTarget.dataset.id);
                this.openDeleteModal(orderId);
            });
        });
    }

    calculateOrderTotal(order) {
        return order.good_ids.length * 1000;
    }

    async openViewModal(orderId) {
        this.currentOrderId = orderId;
        
        try {
            const order = await api.getOrder(orderId);
            await this.showOrderDetails(order);
            this.viewModal.classList.add('active');
        } catch (error) {
            console.error('Error loading order:', error);
            showError('Ошибка загрузки данных заказа');
        }
    }

    async showOrderDetails(order) {
        const orderDate = new Date(order.created_at);
        const updateDate = new Date(order.updated_at);
        const deliveryDate = new Date(order.delivery_date);
        
        const orderDateStr = orderDate.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const updateDateStr = updateDate.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const deliveryDateStr = deliveryDate.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const orderTotal = this.calculateOrderTotal(order);
        
        // Загружаем названия товаров для этого заказа
        const goodsNames = await this.loadGoodsForOrder(order);
        
        this.viewOrderDetails.innerHTML = `
            <div class="detail-row">
                <div class="detail-label">Номер заказа:</div>
                <div class="detail-value">#${order.id}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Дата оформления:</div>
                <div class="detail-value">${orderDateStr}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Последнее обновление:</div>
                <div class="detail-value">${updateDateStr}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Имя:</div>
                <div class="detail-value">${order.full_name}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Email:</div>
                <div class="detail-value">${order.email}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Телефон:</div>
                <div class="detail-value">${order.phone}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Рассылка:</div>
                <div class="detail-value">${order.subscribe ? 'Подписан' : 'Не подписан'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Адрес доставки:</div>
                <div class="detail-value">${order.delivery_address}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Дата доставки:</div>
                <div class="detail-value">${deliveryDateStr}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Время доставки:</div>
                <div class="detail-value">${order.delivery_interval}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Состав заказа:</div>
                <div class="detail-value">
                    <div class="order-items">
                        ${goodsNames.map(name => 
                            `<span class="order-item">${name}</span>`
                        ).join('')}
                    </div>
                    <div class="order-items-count">
                        Всего товаров: ${order.good_ids.length}
                    </div>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Итоговая стоимость:</div>
                <div class="detail-value order-total">${this.formatPrice(orderTotal)} ₽</div>
            </div>
            ${order.comment ? `
                <div class="detail-row">
                    <div class="detail-label">Комментарий:</div>
                    <div class="detail-value">${order.comment}</div>
                </div>
            ` : ''}
        `;
    }

    async openEditModal(orderId) {
        this.currentOrderId = orderId;
        
        try {
            const order = await api.getOrder(orderId);
            this.populateEditForm(order);
            this.editModal.classList.add('active');
        } catch (error) {
            console.error('Error loading order for edit:', error);
            showError('Ошибка загрузки данных заказа');
        }
    }

    populateEditForm(order) {
        document.getElementById('edit-order-id').value = order.id;
        document.getElementById('edit-full-name').value = order.full_name;
        document.getElementById('edit-email').value = order.email;
        document.getElementById('edit-phone').value = order.phone;
        document.getElementById('edit-subscribe').checked = order.subscribe === true || order.subscribe === 1;
        document.getElementById('edit-delivery-address').value = order.delivery_address;
        
        const deliveryDate = new Date(order.delivery_date);
        document.getElementById('edit-delivery-date').value = deliveryDate.toISOString().split('T')[0];
        
        document.getElementById('edit-delivery-interval').value = order.delivery_interval;
        document.getElementById('edit-comment').value = order.comment || '';
    }

    async handleEditSubmit(e) {
        e.preventDefault();
        
        const orderId = this.currentOrderId;
        const formData = {
            full_name: document.getElementById('edit-full-name').value,
            email: document.getElementById('edit-email').value,
            phone: document.getElementById('edit-phone').value.replace(/\s|-|\(|\)/g, ''),
            subscribe: document.getElementById('edit-subscribe').checked,
            delivery_address: document.getElementById('edit-delivery-address').value,
            delivery_date: document.getElementById('edit-delivery-date').value,
            delivery_interval: document.getElementById('edit-delivery-interval').value,
            comment: document.getElementById('edit-comment').value || ''
        };
        
        if (!this.validateEditForm(formData)) {
            return;
        }
        
        try {
            const updatedOrder = await api.updateOrder(orderId, formData);
            
            await this.loadOrders();
            
            this.closeAllModals();
            showSuccess('Заказ успешно обновлен!');
            
        } catch (error) {
            console.error('Error updating order:', error);
            showError(`Ошибка обновления заказа: ${error.message}`);
        }
    }

    validateEditForm(formData) {
        const requiredFields = ['full_name', 'email', 'phone', 'delivery_address', 'delivery_date', 'delivery_interval'];
        for (const field of requiredFields) {
            if (!formData[field]) {
                showError(`Заполните поле: ${this.getFieldLabel(field)}`);
                document.getElementById(`edit-${this.getFieldId(field)}`)?.focus();
                return false;
            }
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            showError('Введите корректный email');
            document.getElementById('edit-email').focus();
            return false;
        }
        
        const phoneRegex = /^\+7\d{10}$/;
        if (!phoneRegex.test(formData.phone)) {
            showError('Введите корректный телефон (+7XXXXXXXXXX)');
            document.getElementById('edit-phone').focus();
            return false;
        }
        
        return true;
    }

    openDeleteModal(orderId) {
        this.currentOrderId = orderId;
        this.deleteModal.classList.add('active');
    }

    async handleDelete() {
        const orderId = this.currentOrderId;
        
        try {
            await api.deleteOrder(orderId);
            
            this.orders = this.orders.filter(order => order.id !== orderId);
            
            this.renderOrders();
            
            this.closeAllModals();
            showSuccess('Заказ успешно удален!');
            
        } catch (error) {
            console.error('Error deleting order:', error);
            showError(`Ошибка удаления заказа: ${error.message}`);
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        this.currentOrderId = null;
    }

    showEmptyOrders() {
        this.emptyOrders.style.display = 'block';
        this.ordersBody.innerHTML = '';
    }

    showLoading(show) {
        if (show) {
            this.ordersLoading.style.display = 'block';
            this.ordersBody.style.opacity = '0.5';
        } else {
            this.ordersLoading.style.display = 'none';
            this.ordersBody.style.opacity = '1';
        }
    }

    formatPrice(price) {
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    getFieldLabel(field) {
        const labels = {
            full_name: 'Имя и фамилия',
            email: 'Email',
            phone: 'Телефон',
            delivery_address: 'Адрес доставки',
            delivery_date: 'Дата доставки',
            delivery_interval: 'Время доставки'
        };
        return labels[field] || field;
    }

    getFieldId(field) {
        const ids = {
            full_name: 'full-name',
            email: 'email',
            phone: 'phone',
            delivery_address: 'delivery-address',
            delivery_date: 'delivery-date',
            delivery_interval: 'delivery-interval'
        };
        return ids[field] || field;
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.account = new Account();
});