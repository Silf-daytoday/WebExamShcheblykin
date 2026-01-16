class Catalog {
    constructor() {
        this.goods = [];
        this.filteredGoods = [];
        this.allCategories = new Set();
        this.currentSearch = '';
        this.currentSort = '';
        this.currentFilters = {
            categories: [],
            priceFrom: null,
            priceTo: null,
            discountOnly: false
        };
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.setupMobileMenu();
        this.loadAllGoods();
        this.updateCartCount();
    }

    cacheElements() {
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');
        this.autocompleteDropdown = document.getElementById('autocomplete-dropdown');
        this.catalog = document.getElementById('catalog');
        this.sortSelect = document.getElementById('sort-select');
        this.loadMoreBtn = document.getElementById('load-more');
        this.noResults = document.getElementById('no-results');
        this.loading = document.getElementById('loading');
        this.applyFiltersBtn = document.getElementById('apply-filters');
        this.resetFiltersBtn = document.getElementById('reset-filters');
        this.categoryFilters = document.getElementById('category-filters');
        this.priceFrom = document.getElementById('price-from');
        this.priceTo = document.getElementById('price-to');
        this.discountOnly = document.getElementById('discount-only');
        this.paginationInfo = document.getElementById('pagination-info');
    }

    bindEvents() {
        // Поиск с автодополнением
        this.searchInput.addEventListener('input', this.handleSearchInput.bind(this));
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Сортировка
        this.sortSelect.addEventListener('change', () => {
            this.currentSort = this.sortSelect.value;
            this.applySorting();
            this.showNotification('Сортировка применена', 'success');
        });

        // Фильтры
        this.applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        this.resetFiltersBtn.addEventListener('click', () => this.resetFilters());

        // Загрузка еще (скрываем, так как загружаем все сразу)
        this.loadMoreBtn.style.display = 'none';

        // Обработка клика вне автодополнения
        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) && 
                !this.autocompleteDropdown.contains(e.target)) {
                this.autocompleteDropdown.style.display = 'none';
            }
        });
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

    async loadAllGoods() {
        if (this.isLoading) return;
        
        this.showLoading(true);
        this.isLoading = true;
        
        try {
            // Пробуем загрузить все товары без пагинации
            let allGoods = [];
            let page = 1;
            const perPage = 100; // Большое число для получения всех товаров
            let hasMore = true;
            
            console.log('Начинаем загрузку всех товаров...');
            
            // Загружаем постранично, пока есть товары
            while (hasMore && page <= 10) { // Ограничим 10 страницами на случай ошибки
                console.log(`Загрузка страницы ${page}...`);
                
                const params = {};
                if (this.currentSearch) params.query = this.currentSearch;
                params.page = page;
                params.per_page = perPage;
                
                const response = await api.getGoods(params);
                
                let goods = [];
                if (response && response._pagination) {
                    goods = response.goods || [];
                    const totalCount = response._pagination.total_count;
                    const loadedCount = allGoods.length + goods.length;
                    hasMore = loadedCount < totalCount;
                    console.log(`Загружено ${loadedCount} из ${totalCount} товаров`);
                } else if (Array.isArray(response)) {
                    goods = response;
                    hasMore = goods.length === perPage;
                    console.log(`Загружено ${goods.length} товаров на странице ${page}`);
                } else {
                    goods = [];
                    hasMore = false;
                }
                
                if (goods.length === 0) {
                    hasMore = false;
                    break;
                }
                
                allGoods = allGoods.concat(goods);
                page++;
            }
            
            console.log(`Всего загружено товаров: ${allGoods.length}`);
            
            // Убираем дубликаты по ID
            const uniqueGoods = [];
            const seenIds = new Set();
            
            for (const good of allGoods) {
                if (good && good.id && !seenIds.has(good.id)) {
                    seenIds.add(good.id);
                    uniqueGoods.push(good);
                }
            }
            
            this.goods = uniqueGoods;
            this.extractCategories();
            this.applyAllFilters();
            
            this.showNotification(`Загружено ${this.goods.length} товаров`, 'success');
            
        } catch (error) {
            console.error('Error loading goods:', error);
            this.showNotification(`Ошибка загрузки товаров: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
            this.isLoading = false;
        }
    }

    async loadGoodsWithSearch() {
        if (this.isLoading) return;
        
        this.showLoading(true);
        this.isLoading = true;
        
        try {
            const params = {};
            if (this.currentSearch) params.query = this.currentSearch;
            
            // Для поиска загружаем все результаты без пагинации
            const response = await api.getGoods(params);
            
            let goods = [];
            if (response && Array.isArray(response)) {
                goods = response;
            } else if (response && response._pagination) {
                goods = response.goods || [];
            }
            
            // Убираем дубликаты
            const uniqueGoods = [];
            const seenIds = new Set();
            
            for (const good of goods) {
                if (good && good.id && !seenIds.has(good.id)) {
                    seenIds.add(good.id);
                    uniqueGoods.push(good);
                }
            }
            
            this.goods = uniqueGoods;
            this.extractCategories();
            this.applyAllFilters();
            
            if (this.currentSearch) {
                this.showNotification(`Найдено ${this.goods.length} товаров по запросу "${this.currentSearch}"`, 'success');
            }
            
        } catch (error) {
            console.error('Error loading goods with search:', error);
            this.showNotification(`Ошибка загрузки товаров: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
            this.isLoading = false;
        }
    }

    extractCategories() {
        // Собираем все уникальные категории из загруженных товаров
        const categories = new Set();
        this.goods.forEach(good => {
            if (good.main_category) {
                categories.add(good.main_category);
            }
        });
        
        this.allCategories = categories;
        this.renderCategoryFilters();
        
        // Автоматически настраиваем высоту списка категорий
        this.adjustCategoryListHeight();
    }
    adjustCategoryListHeight() {
        const categoryList = document.getElementById('category-filters');
        if (categoryList) {
            // Устанавливаем максимальную высоту в зависимости от количества категорий
            const categoryCount = this.allCategories.size;
            if (categoryCount > 15) {
                categoryList.style.maxHeight = '400px';
            } else if (categoryCount > 10) {
                categoryList.style.maxHeight = '300px';
            } else {
                categoryList.style.maxHeight = '250px';
            }
        }
    }

    renderCategoryFilters() {
        // Создаем массив из Set и сортируем
        const sortedCategories = Array.from(this.allCategories).sort();
        
        this.categoryFilters.innerHTML = sortedCategories.map(category => `
            <label class="checkbox">
                <input type="checkbox" value="${category}" 
                       ${this.currentFilters.categories.includes(category) ? 'checked' : ''}>
                <span class="checkmark"></span>
                <span class="checkbox-text">${category}</span>
            </label>
        `).join('');
        
        // Добавляем обработчики для чекбоксов
        this.categoryFilters.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const value = checkbox.value;
                if (checkbox.checked) {
                    if (!this.currentFilters.categories.includes(value)) {
                        this.currentFilters.categories.push(value);
                    }
                } else {
                    this.currentFilters.categories = this.currentFilters.categories.filter(c => c !== value);
                }
            });
        });
    }

    handleSearchInput() {
        const query = this.searchInput.value.trim();
        
        if (query.length < 2) {
            this.autocompleteDropdown.style.display = 'none';
            return;
        }

        clearTimeout(this.autocompleteTimeout);
        this.autocompleteTimeout = setTimeout(async () => {
            try {
                const suggestions = await api.getAutocomplete(query);
                this.showAutocomplete(suggestions);
            } catch (error) {
                console.error('Autocomplete error:', error);
            }
        }, 300);
    }

    showAutocomplete(suggestions) {
        if (!suggestions || suggestions.length === 0) {
            this.autocompleteDropdown.style.display = 'none';
            return;
        }

        this.autocompleteDropdown.innerHTML = suggestions.slice(0, 10).map(suggestion => `
            <div class="autocomplete-item" data-suggestion="${suggestion}">
                <i class="fas fa-search"></i> ${suggestion}
            </div>
        `).join('');

        this.autocompleteDropdown.style.display = 'block';

        // Обработка клика по подсказке
        this.autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                const suggestion = item.dataset.suggestion;
                this.searchInput.value = suggestion;
                this.autocompleteDropdown.style.display = 'none';
                this.handleSearch();
            });
        });
    }

    handleSearch() {
        const query = this.searchInput.value.trim();
        if (query === this.currentSearch) return;
        
        this.currentSearch = query;
        this.autocompleteDropdown.style.display = 'none';
        this.loadGoodsWithSearch();
    }

    applyFilters() {
        this.currentFilters.priceFrom = this.priceFrom.value ? parseInt(this.priceFrom.value) : null;
        this.currentFilters.priceTo = this.priceTo.value ? parseInt(this.priceTo.value) : null;
        this.currentFilters.discountOnly = this.discountOnly.checked;
        
        // Получаем выбранные категории
        const selectedCategories = Array.from(
            this.categoryFilters.querySelectorAll('input[type="checkbox"]:checked')
        ).map(cb => cb.value);
        this.currentFilters.categories = selectedCategories;
        
        this.applyAllFilters();
        
        this.showNotification('Фильтры применены', 'success');
    }

    resetFilters() {
        // Сброс значений фильтров
        this.priceFrom.value = '';
        this.priceTo.value = '';
        this.discountOnly.checked = false;
        
        // Сброс чекбоксов категорий
        this.categoryFilters.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        
        // Сброс состояния фильтров
        this.currentFilters = {
            categories: [],
            priceFrom: null,
            priceTo: null,
            discountOnly: false
        };
        
        this.applyAllFilters();
        
        this.showNotification('Фильтры сброшены', 'info');
    }

    applyAllFilters() {
        console.log('Применение фильтров:', this.currentFilters);
        
        // Если нет товаров, не применяем фильтры
        if (this.goods.length === 0) {
            this.filteredGoods = [];
            this.renderGoods();
            return;
        }
        
        let filtered = [...this.goods];
        
        // Фильтр по категориям
        if (this.currentFilters.categories.length > 0) {
            filtered = filtered.filter(good => 
                good.main_category && this.currentFilters.categories.includes(good.main_category)
            );
        }
        
        // Фильтр по цене
        filtered = filtered.filter(good => {
            const price = good.discount_price || good.actual_price;
            
            if (this.currentFilters.priceFrom !== null && price < this.currentFilters.priceFrom) {
                return false;
            }
            
            if (this.currentFilters.priceTo !== null && price > this.currentFilters.priceTo) {
                return false;
            }
            
            return true;
        });
        
        // Фильтр по скидке
        if (this.currentFilters.discountOnly) {
            filtered = filtered.filter(good => good.discount_price);
        }
        
        this.filteredGoods = filtered;
        console.log('После фильтрации товаров:', this.filteredGoods.length);
        
        this.applySorting();
    }

    applySorting() {
        if (this.currentSort && this.filteredGoods.length > 0) {
            console.log('Сортировка по:', this.currentSort);
            this.filteredGoods.sort((a, b) => {
                const priceA = a.discount_price || a.actual_price;
                const priceB = b.discount_price || b.actual_price;

                switch (this.currentSort) {
                    case 'rating_desc':
                        return b.rating - a.rating;
                    case 'rating_asc':
                        return a.rating - b.rating;
                    case 'price_desc':
                        return priceB - priceA;
                    case 'price_asc':
                        return priceA - priceB;
                    default:
                        return 0;
                }
            });
        }
        
        this.renderGoods();
        this.updatePaginationInfo();
    }

    renderGoods() {
        console.log('Рендеринг товаров:', this.filteredGoods.length);
        
        if (this.filteredGoods.length === 0) {
            this.catalog.innerHTML = '';
            this.noResults.style.display = 'block';
            this.loadMoreBtn.style.display = 'none';
            this.paginationInfo.textContent = 'Товары не найдены';
            return;
        }

        this.noResults.style.display = 'none';
        
        // Получаем корзину из localStorage
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        this.catalog.innerHTML = this.filteredGoods.map(good => {
            const price = good.discount_price || good.actual_price;
            const oldPrice = good.discount_price ? good.actual_price : null;
            const isInCart = cart.includes(good.id);
            
            // Форматирование рейтинга с UTF-8 символами
            const rating = Math.round(good.rating);
            let starsHtml = '';
            for (let i = 0; i < 5; i++) {
                if (i < rating) {
                    starsHtml += '<span class="star filled">★</span>';
                } else {
                    starsHtml += '<span class="star empty">☆</span>';
                }
            }
            
            return `
                <div class="product-card" data-id="${good.id}">
                    <div class="product-image-container">
                        <img src="${good.image_url}" alt="${good.name}" 
                            class="product-image" loading="lazy">
                        ${good.discount_price ? 
                            `<div class="discount-badge">
                                <span class="icon">🔥</span> Скидка
                            </div>` : ''
                        }
                    </div>
                    <div class="product-info">
                        <h3 class="product-title" title="${good.name}">
                            ${this.truncateText(good.name, 70)}
                        </h3>
                        <div class="product-rating">
                            <div class="rating-stars">
                                ${starsHtml}
                            </div>
                            <span class="rating-value">${good.rating.toFixed(1)}</span>
                        </div>
                        <div class="product-price">
                            <span class="current-price">${this.formatPrice(price)} ₽</span>
                            ${oldPrice ? 
                                `<span class="old-price">${this.formatPrice(oldPrice)} ₽</span>` : ''
                            }
                        </div>
                        <button class="add-to-cart ${isInCart ? 'in-cart' : ''}" 
                                data-id="${good.id}"
                                ${isInCart ? 'disabled' : ''}>
                            ${isInCart ? 
                                '<span class="icon">✓</span> В корзине' : 
                                '<span class="icon">➕</span> В корзину'
                            }
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Добавляем обработчики для кнопок добавления в корзину
        this.catalog.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = parseInt(e.currentTarget.dataset.id);
                this.addToCart(productId);
            });
        });
    }

    addToCart(productId) {
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        cart = [...new Set(cart)];
        
        if (!cart.includes(productId)) {
            cart.push(productId);
            localStorage.setItem('cart', JSON.stringify(cart));
            
            // Обновляем все кнопки добавления в корзину для этого товара
            const buttons = document.querySelectorAll(`.add-to-cart[data-id="${productId}"]`);
            buttons.forEach(button => {
                button.classList.add('in-cart');
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-check"></i> В корзине';
            });
            
            this.updateCartCount();
            this.showNotification('Товар добавлен в корзину!', 'success');
        } else {
            this.showNotification('Этот товар уже в корзине', 'info');
        }
    }

    updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const cartCount = document.getElementById('cart-count');
        const mobileCartCount = document.getElementById('mobile-cart-count');
        
        const uniqueCart = [...new Set(cart)];
        const count = uniqueCart.length;
        
        if (cartCount) {
            cartCount.textContent = count;
            cartCount.style.display = count > 0 ? 'flex' : 'none';
        }
        
        if (mobileCartCount) {
            mobileCartCount.textContent = count;
            mobileCartCount.style.display = count > 0 ? 'inline-block' : 'none';
        }
    }

    updatePaginationInfo() {
        const total = this.filteredGoods.length;
        
        if (total > 0) {
            this.paginationInfo.textContent = `Найдено ${total} товаров`;
            this.paginationInfo.style.display = 'block';
        } else {
            this.paginationInfo.textContent = '';
            this.paginationInfo.style.display = 'none';
        }
    }

    showLoading(show) {
        if (show) {
            this.loading.style.display = 'block';
            if (this.catalog) {
                this.catalog.style.opacity = '0.5';
            }
        } else {
            this.loading.style.display = 'none';
            if (this.catalog) {
                this.catalog.style.opacity = '1';
            }
        }
    }

    showNotification(message, type = 'info') {
        // Используем глобальную функцию showNotification
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`${type}: ${message}`);
        }
    }

    formatPrice(price) {
        if (!price) return '0';
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.catalog = new Catalog();
});