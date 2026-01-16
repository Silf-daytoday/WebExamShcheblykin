class Cart {
    constructor() {
        this.cartItems = [];
        this.cartProducts = [];
        this.totalAmount = 0;
        this.deliveryCost = 0;
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.setupMobileMenu();
        this.loadCartItems();
        this.setupFormValidation();
        this.updateDeliveryDate();
    }

    cacheElements() {
        this.cartItemsContainer = document.getElementById('cart-items');
        this.emptyCart = document.getElementById('empty-cart');
        this.cartLoading = document.getElementById('cart-loading');
        this.orderForm = document.getElementById('order-form');
        this.productsTotal = document.getElementById('products-total');
        this.deliveryCostElement = document.getElementById('delivery-cost');
        this.orderTotal = document.getElementById('order-total');
        this.submitOrderBtn = document.getElementById('submit-order');
        this.deliveryDate = document.getElementById('delivery-date');
        this.deliveryInterval = document.getElementById('delivery-interval');
        this.mobileCartCount = document.getElementById('mobile-cart-count');
    }

    bindEvents() {
        this.deliveryDate.addEventListener('change', () => this.calculateDeliveryCost());
        this.deliveryInterval.addEventListener('change', () => this.calculateDeliveryCost());
        this.orderForm.addEventListener('submit', (e) => this.handleOrderSubmit(e));
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

    setupFormValidation() {
        const phoneInput = document.getElementById('phone');
        phoneInput.addEventListener('input', function(e) {
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

    updateDeliveryDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0];
        this.deliveryDate.min = minDate;
        
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 1);
        this.deliveryDate.max = maxDate.toISOString().split('T')[0];
        
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 3);
        this.deliveryDate.value = defaultDate.toISOString().split('T')[0];
    }

    async loadCartItems() {
        // Убираем дубликаты при загрузке из localStorage
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        this.cartItems = [...new Set(cart)];
        
        // Сохраняем обратно без дубликатов
        localStorage.setItem('cart', JSON.stringify(this.cartItems));
        
        if (this.cartItems.length === 0) {
            this.showEmptyCart();
            this.updateCartCount();
            return;
        }
        
        this.showLoading(true);
        
        try {
            // Загружаем информацию о товарах, убираем дубликаты
            const uniqueIds = [...new Set(this.cartItems)];
            const productPromises = uniqueIds.map(id => api.getGood(id));
            const products = await Promise.all(productPromises);
            
            // Убираем null/undefined товары
            this.cartProducts = products.filter(product => product != null);
            
            this.renderCartItems();
            this.calculateTotal();
            this.calculateDeliveryCost();
            this.updateCartCount();
        } catch (error) {
            console.error('Error loading cart items:', error);
            showError('Ошибка загрузки корзины');
        } finally {
            this.showLoading(false);
        }
    }

    renderCartItems() {
        if (this.cartProducts.length === 0) {
            this.showEmptyCart();
            return;
        }
        
        // Группируем товары по ID для отображения количества
        const productMap = new Map();
        this.cartProducts.forEach(product => {
            if (!productMap.has(product.id)) {
                productMap.set(product.id, {
                    product: product,
                    quantity: 1
                });
            } else {
                const item = productMap.get(product.id);
                item.quantity++;
                productMap.set(product.id, item);
            }
        });
        
        this.cartItemsContainer.innerHTML = Array.from(productMap.values()).map(item => {
            const product = item.product;
            const price = product.discount_price || product.actual_price;
            const oldPrice = product.discount_price ? product.actual_price : null;
            const totalPrice = price * item.quantity;
            
            // Форматирование рейтинга с UTF-8 символами
            const rating = Math.round(product.rating);
            let starsHtml = '';
            for (let i = 0; i < 5; i++) {
                if (i < rating) {
                    starsHtml += '<span class="star filled">★</span>';
                } else {
                    starsHtml += '<span class="star empty">☆</span>';
                }
            }
            
            return `
                <div class="cart-item" data-id="${product.id}">
                    <div class="cart-item-image">
                        <img src="${product.image_url}" alt="${product.name}">
                        ${item.quantity > 1 ? 
                            `<div class="item-quantity">${item.quantity}</div>` : ''
                        }
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-header">
                            <h3 class="cart-item-title">${product.name}</h3>
                            <div class="item-controls">
                                ${item.quantity > 1 ? `
                                    <button class="quantity-btn decrease" data-id="${product.id}">
                                        <span class="icon">−</span>
                                    </button>
                                    <span class="quantity">${item.quantity} шт.</span>
                                    <button class="quantity-btn increase" data-id="${product.id}">
                                        <span class="icon">+</span>
                                    </button>
                                ` : ''}
                                <button class="remove-item" data-id="${product.id}">
                                    <span class="icon">🗑️</span>
                                </button>
                            </div>
                        </div>
                        <div class="cart-item-rating">
                            <div class="rating-stars">
                                ${starsHtml}
                            </div>
                            <span>${product.rating.toFixed(1)}</span>
                        </div>
                        <div class="cart-item-price-info">
                            <span class="cart-item-price">${this.formatPrice(price)} ₽ × ${item.quantity}</span>
                            ${oldPrice ? 
                                `<span class="cart-item-old-price">${this.formatPrice(oldPrice)} ₽</span>` : 
                                ''
                            }
                            <div class="item-total">Итого: ${this.formatPrice(totalPrice)} ₽</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Добавляем обработчики
        this.addEventHandlers();
    }

    addEventHandlers() {
        // Удаление товара
        this.cartItemsContainer.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = parseInt(e.currentTarget.dataset.id);
                this.removeFromCart(productId, true); // true - удалить все экземпляры
            });
        });
        
        // Увеличение количества
        this.cartItemsContainer.querySelectorAll('.increase').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = parseInt(e.currentTarget.dataset.id);
                this.addToCart(productId);
            });
        });
        
        // Уменьшение количества
        this.cartItemsContainer.querySelectorAll('.decrease').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = parseInt(e.currentTarget.dataset.id);
                this.decreaseQuantity(productId);
            });
        });
    }

    addToCart(productId) {
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        cart.push(productId);
        localStorage.setItem('cart', JSON.stringify(cart));
        
        this.loadCartItems(); // Перезагружаем корзину
        showNotification('Товар добавлен в корзину', 'success');
    }

    decreaseQuantity(productId) {
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        // Находим последнее вхождение товара
        const index = cart.lastIndexOf(productId);
        if (index !== -1) {
            cart.splice(index, 1);
            localStorage.setItem('cart', JSON.stringify(cart));
            this.loadCartItems();
            showNotification('Количество товара уменьшено', 'info');
        }
    }

    removeFromCart(productId, removeAll = false) {
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        if (removeAll) {
            cart = cart.filter(id => id !== productId);
        } else {
            const index = cart.indexOf(productId);
            if (index !== -1) {
                cart.splice(index, 1);
            }
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        this.loadCartItems();
        showNotification('Товар удален из корзины', 'success');
    }

    calculateTotal() {
        this.totalAmount = this.cartProducts.reduce((total, product) => {
            const price = product.discount_price || product.actual_price;
            return total + price;
        }, 0);
        
        this.productsTotal.textContent = `${this.formatPrice(this.totalAmount)} ₽`;
        this.updateOrderTotal();
    }

    calculateDeliveryCost() {
        const date = new Date(this.deliveryDate.value);
        const interval = this.deliveryInterval.value;
        
        if (!date || !interval) {
            this.deliveryCost = 0;
            this.deliveryCostElement.textContent = '0 ₽';
            this.updateOrderTotal();
            return;
        }
        
        let cost = 200;
        const day = date.getDay();
        
        if (day === 0 || day === 6) {
            cost += 300;
        }
        
        if ((day >= 1 && day <= 5) && interval === '18:00-22:00') {
            cost += 200;
        }
        
        this.deliveryCost = cost;
        this.deliveryCostElement.textContent = `${this.formatPrice(cost)} ₽`;
        this.updateOrderTotal();
    }

    updateOrderTotal() {
        const total = this.totalAmount + this.deliveryCost;
        this.orderTotal.textContent = `${this.formatPrice(total)} ₽`;
    }

    updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const uniqueCount = [...new Set(cart)].length;
        
        if (this.mobileCartCount) {
            this.mobileCartCount.textContent = uniqueCount;
            this.mobileCartCount.style.display = uniqueCount > 0 ? 'inline-block' : 'none';
        }
    }

    async handleOrderSubmit(e) {
        e.preventDefault();
        
        if (this.cartItems.length === 0) {
            showError('Корзина пуста. Добавьте товары для оформления заказа.');
            return;
        }
        
        const formData = {
            full_name: document.getElementById('full-name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value.replace(/\s|-|\(|\)/g, ''),
            subscribe: document.getElementById('subscribe').checked,
            delivery_address: document.getElementById('delivery-address').value,
            delivery_date: this.deliveryDate.value,
            delivery_interval: this.deliveryInterval.value,
            comment: document.getElementById('comment').value || '',
            good_ids: [...new Set(this.cartItems)] // Убираем дубликаты при отправке
        };
        
        if (!this.validateForm(formData)) {
            return;
        }
        
        this.submitOrderBtn.disabled = true;
        this.submitOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Оформление...';
        
        try {
            const order = await api.createOrder(formData);
            showSuccess('Заказ успешно оформлен!');
            
            localStorage.removeItem('cart');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error creating order:', error);
            showError(`Ошибка оформления заказа: ${error.message}`);
            
            this.submitOrderBtn.disabled = false;
            this.submitOrderBtn.innerHTML = '<i class="fas fa-check"></i> Оформить заказ';
        }
    }

    validateForm(formData) {
        const requiredFields = ['full_name', 'email', 'phone', 'delivery_address', 'delivery_date', 'delivery_interval'];
        for (const field of requiredFields) {
            if (!formData[field]) {
                showError(`Заполните поле: ${this.getFieldLabel(field)}`);
                document.getElementById(this.getFieldId(field))?.focus();
                return false;
            }
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            showError('Введите корректный email');
            document.getElementById('email').focus();
            return false;
        }
        
        const phoneRegex = /^\+7\d{10}$/;
        if (!phoneRegex.test(formData.phone)) {
            showError('Введите корректный телефон (+7XXXXXXXXXX)');
            document.getElementById('phone').focus();
            return false;
        }
        
        return true;
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

    showEmptyCart() {
        this.emptyCart.style.display = 'block';
        this.cartItemsContainer.innerHTML = '';
        this.totalAmount = 0;
        this.deliveryCost = 0;
        this.productsTotal.textContent = '0 ₽';
        this.deliveryCostElement.textContent = '0 ₽';
        this.orderTotal.textContent = '0 ₽';
        this.submitOrderBtn.disabled = true;
    }

    showLoading(show) {
        if (show) {
            this.cartLoading.style.display = 'block';
            this.cartItemsContainer.style.opacity = '0.5';
        } else {
            this.cartLoading.style.display = 'none';
            this.cartItemsContainer.style.opacity = '1';
        }
    }

    formatPrice(price) {
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.cart = new Cart();
});