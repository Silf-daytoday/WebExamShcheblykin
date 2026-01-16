const API_BASE_URL = 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api';
const API_KEY = '6b9b4bf3-19bc-4bcd-b50a-378208a84b64';

class ApiService {
    constructor() {
        this.apiKey = API_KEY;
        this.studentId = null;
    }

    async request(endpoint, method = 'GET', data = null, params = {}) {
        try {
            // Создаем URL с параметрами
            const url = new URL(`${API_BASE_URL}${endpoint}`);
            
            // Добавляем API ключ
            url.searchParams.append('api_key', this.apiKey);
            
            // Добавляем остальные параметры
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                    url.searchParams.append(key, params[key]);
                }
            });

            // Настройки запроса
            const options = {
                method,
                headers: {
                    'Accept': 'application/json',
                },
            };

            // Добавляем тело запроса для POST/PUT
            if (data && (method === 'POST' || method === 'PUT')) {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(data);
            }

            console.log(`API Request: ${method} ${url.toString()}`);
            
            const response = await fetch(url, options);
            
            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    // Не удалось распарсить JSON
                }
                throw new Error(errorMessage);
            }

            // Пробуем получить JSON
            try {
                const result = await response.json();
                console.log(`API Response from ${endpoint}:`, result.length || (result.goods ? result.goods.length : 0), 'items');
                return result;
            } catch (e) {
                console.log(`API Response from ${endpoint}: empty`);
                return null;
            }
        } catch (error) {
            console.error('API request failed:', error);
            
            // Показываем понятное пользователю сообщение
            let userMessage = 'Ошибка при выполнении запроса';
            if (error.message.includes('authorization')) {
                userMessage = 'Ошибка авторизации. Проверьте API ключ';
            } else if (error.message.includes('network')) {
                userMessage = 'Ошибка сети. Проверьте подключение к интернету';
            } else if (error.message.includes('Failed to fetch')) {
                userMessage = 'Ошибка соединения с сервером';
            }
            
            throw new Error(userMessage);
        }
    }

    // Товары - возвращает ВСЕ товары или результаты поиска
    async getGoods(params = {}) {
        // Если нет параметров пагинации, API по умолчанию возвращает только 10 товаров
        // Поэтому для загрузки всех товаров используем пагинацию с большим per_page
        if (!params.page && !params.per_page && !params.query) {
            // Для обычного каталога будем использовать пагинацию
            params.page = 1;
            params.per_page = 100; // Большое число, чтобы получить много товаров за раз
        }
        
        return this.request('/goods', 'GET', null, params);
    }

    async getGood(id) {
        return this.request(`/goods/${id}`);
    }

    async searchGoods(query, params = {}) {
        // Для поиска передаем query, API вернет результаты поиска
        return this.getGoods({ query, ...params });
    }

    async getAutocomplete(query) {
        return this.request('/autocomplete', 'GET', null, { query });
    }

    // Заказы
    async getOrders() {
        return this.request('/orders');
    }

    async getOrder(id) {
        return this.request(`/orders/${id}`);
    }

    async createOrder(orderData) {
        // Преобразуем дату в формат dd.mm.yyyy
        if (orderData.delivery_date) {
            const date = new Date(orderData.delivery_date);
            orderData.delivery_date = date.toLocaleDateString('ru-RU');
        }
        
        // Преобразуем subscribe в boolean (0/1)
        orderData.subscribe = orderData.subscribe ? 1 : 0;
        
        return this.request('/orders', 'POST', orderData);
    }

    async updateOrder(id, orderData) {
        // Преобразуем дату в формат dd.mm.yyyy
        if (orderData.delivery_date) {
            const date = new Date(orderData.delivery_date);
            orderData.delivery_date = date.toLocaleDateString('ru-RU');
        }
        
        // Преобразуем subscribe в boolean (0/1)
        if (orderData.subscribe !== undefined) {
            orderData.subscribe = orderData.subscribe ? 1 : 0;
        }
        
        return this.request(`/orders/${id}`, 'PUT', orderData);
    }

    async deleteOrder(id) {
        return this.request(`/orders/${id}`, 'DELETE');
    }
}

// Создаем экземпляр API сервиса
const api = new ApiService();