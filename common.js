// ===== Темы =====
export const THEMES = {
    dark: {
        name: 'Тёмно-серая',
        vars: {
            '--bg': '#1a1a1a', '--bg-panel': '#2a2a2a', '--bg-input': '#1f1f1f',
            '--bg-input-focus': '#242424', '--bg-hover': '#3a3a3a', '--bg-active': '#4a4a4a',
            '--border': '#3a3a3a', '--border-hover': '#555555',
            '--text': '#e0e0e0', '--text-dim': '#999999', '--text-strong': '#ffffff', '--text-muted': '#888888',
            '--danger': '#cc8888', '--danger-bg': '#3a1f1f', '--danger-border': '#553333',
            '--success': '#88cc88', '--success-bg': '#1f3a1f', '--success-border': '#335533'
        }
    },
    black: {
        name: 'Чёрная',
        vars: {
            '--bg': '#000000', '--bg-panel': '#0d0d0d', '--bg-input': '#111111',
            '--bg-input-focus': '#181818', '--bg-hover': '#1c1c1c', '--bg-active': '#262626',
            '--border': '#222222', '--border-hover': '#3a3a3a',
            '--text': '#d0d0d0', '--text-dim': '#707070', '--text-strong': '#ffffff', '--text-muted': '#5a5a5a',
            '--danger': '#cc8888', '--danger-bg': '#2a0f0f', '--danger-border': '#442222',
            '--success': '#88cc88', '--success-bg': '#0f2a0f', '--success-border': '#224422'
        }
    },
    blue: {
        name: 'Синяя',
        vars: {
            '--bg': '#0f1720', '--bg-panel': '#16212e', '--bg-input': '#0c141c',
            '--bg-input-focus': '#121e29', '--bg-hover': '#1f2e40', '--bg-active': '#2a3d52',
            '--border': '#22303f', '--border-hover': '#3a5a7a',
            '--text': '#d6e2ee', '--text-dim': '#8398ab', '--text-strong': '#ffffff', '--text-muted': '#5f7080',
            '--danger': '#e08a8a', '--danger-bg': '#2a1518', '--danger-border': '#4a2028',
            '--success': '#8ad0a8', '--success-bg': '#0f2a1c', '--success-border': '#204a35'
        }
    },
    green: {
        name: 'Зелёная',
        vars: {
            '--bg': '#0f1a12', '--bg-panel': '#16261c', '--bg-input': '#0c140f',
            '--bg-input-focus': '#121f18', '--bg-hover': '#1e3426', '--bg-active': '#294732',
            '--border': '#233327', '--border-hover': '#3d6647',
            '--text': '#d6eedb', '--text-dim': '#88ab92', '--text-strong': '#ffffff', '--text-muted': '#5f8066',
            '--danger': '#e08a8a', '--danger-bg': '#2a1518', '--danger-border': '#4a2028',
            '--success': '#8ad0a8', '--success-bg': '#0f2a1c', '--success-border': '#204a35'
        }
    },
    red: {
        name: 'Красная',
        vars: {
            '--bg': '#1a0f0f', '--bg-panel': '#261616', '--bg-input': '#140c0c',
            '--bg-input-focus': '#1f1212', '--bg-hover': '#341e1e', '--bg-active': '#472929',
            '--border': '#332323', '--border-hover': '#664040',
            '--text': '#eed6d6', '--text-dim': '#ab8888', '--text-strong': '#ffffff', '--text-muted': '#806060',
            '--danger': '#e08a8a', '--danger-bg': '#2a1010', '--danger-border': '#4a2020',
            '--success': '#8ad0a8', '--success-bg': '#0f2a1c', '--success-border': '#204a35'
        }
    },
    light: {
        name: 'Светлая',
        vars: {
            '--bg': '#e8e8e8', '--bg-panel': '#f5f5f5', '--bg-input': '#ffffff',
            '--bg-input-focus': '#fafafa', '--bg-hover': '#dddddd', '--bg-active': '#cccccc',
            '--border': '#cccccc', '--border-hover': '#aaaaaa',
            '--text': '#222222', '--text-dim': '#666666', '--text-strong': '#000000', '--text-muted': '#888888',
            '--danger': '#aa3333', '--danger-bg': '#ffe0e0', '--danger-border': '#ffbbbb',
            '--success': '#228855', '--success-bg': '#e0ffe8', '--success-border': '#aaddbb'
        }
    }
};

// ===== Языки =====
export const LANGS = {
    ru: {
        name: 'Русский',
        t: {
            'nav.home': 'Главная', 'nav.shop': 'Магазин', 'nav.accounts': 'Аккаунты',
            'menu.account_editor': 'Редактор аккаунта', 'menu.settings': 'Настройки', 'menu.logout': 'Выйти с аккаунта',
            'home.welcome': 'Добро пожаловать в HyoJoy', 'home.subtitle': 'Выберите раздел в меню сверху',
            'settings.title': 'Настройки', 'settings.theme': 'Тема оформления', 'settings.language': 'Язык',
            'settings.saved': 'Сохранено', 'settings.reset': 'Сбросить настройки', 'settings.back': 'Назад',
            'auth.login': 'Вход', 'auth.register': 'Регистрация',
            'auth.nick': 'Ник', 'auth.password': 'Пароль', 'auth.password2': 'Повторите пароль',
            'auth.enter_nick': 'Введите ник', 'auth.enter_pass': 'Введите пароль',
            'auth.create_nick': 'Придумайте ник', 'auth.create_pass': 'Придумайте пароль', 'auth.repeat_pass': 'Повторите пароль',
            'auth.login_btn': 'Войти', 'auth.register_btn': 'Зарегистрироваться',
            'users.title': 'Все аккаунты', 'users.num': '#', 'users.nick': 'Ник',
            'users.tag': 'Тег (UID)', 'users.date': 'Дата регистрации',
            'users.total': 'Всего аккаунтов', 'users.loading': 'Загрузка...',
            'users.empty': 'Пока нет зарегистрированных аккаунтов', 'users.back': 'Назад',
            'account.title': 'Редактор аккаунта',
            'account.change_nick': 'Смена ника', 'account.change_pass': 'Смена пароля',
            'account.new_nick': 'Новый ник', 'account.current_pass': 'Текущий пароль',
            'account.new_pass': 'Новый пароль', 'account.repeat_new_pass': 'Повторите новый пароль',
            'account.confirm_pass': 'Пароль для подтверждения',
            'account.change_nick_btn': 'Сменить ник', 'account.change_pass_btn': 'Сменить пароль', 'account.back': 'Назад',
            'store.title': 'Магазин', 'store.add_to_cart': 'Добавить в корзину', 'store.added': 'Добавлено',
            'store.in_stock': 'В наличии', 'store.out_of_stock': 'Нет в наличии',
            'store.cart': 'Корзина', 'store.empty_cart': 'Корзина пуста', 'store.total': 'Итого',
            'store.checkout': 'Оформить заказ', 'store.remove': 'Удалить', 'store.quantity': 'Количество',
            'store.back_to_store': 'Назад в магазин', 'store.back': 'Назад', 'store.product_not_found': 'Товар не найден'
        }
    },
    en: {
        name: 'English',
        t: {
            'nav.home': 'Home', 'nav.shop': 'Store', 'nav.accounts': 'Accounts',
            'menu.account_editor': 'Account editor', 'menu.settings': 'Settings', 'menu.logout': 'Log out',
            'home.welcome': 'Welcome to HyoJoy', 'home.subtitle': 'Choose a section in the top menu',
            'settings.title': 'Settings', 'settings.theme': 'Theme', 'settings.language': 'Language',
            'settings.saved': 'Saved', 'settings.reset': 'Reset settings', 'settings.back': 'Back',
            'auth.login': 'Sign in', 'auth.register': 'Sign up',
            'auth.nick': 'Nickname', 'auth.password': 'Password', 'auth.password2': 'Repeat password',
            'auth.enter_nick': 'Enter nickname', 'auth.enter_pass': 'Enter password',
            'auth.create_nick': 'Choose nickname', 'auth.create_pass': 'Choose password', 'auth.repeat_pass': 'Repeat password',
            'auth.login_btn': 'Sign in', 'auth.register_btn': 'Sign up',
            'users.title': 'All accounts', 'users.num': '#', 'users.nick': 'Nickname',
            'users.tag': 'Tag (UID)', 'users.date': 'Registered',
            'users.total': 'Total accounts', 'users.loading': 'Loading...',
            'users.empty': 'No accounts yet', 'users.back': 'Back',
            'account.title': 'Account editor',
            'account.change_nick': 'Change nickname', 'account.change_pass': 'Change password',
            'account.new_nick': 'New nickname', 'account.current_pass': 'Current password',
            'account.new_pass': 'New password', 'account.repeat_new_pass': 'Repeat new password',
            'account.confirm_pass': 'Confirm password',
            'account.change_nick_btn': 'Change nickname', 'account.change_pass_btn': 'Change password', 'account.back': 'Back',
            'store.title': 'Store', 'store.add_to_cart': 'Add to cart', 'store.added': 'Added',
            'store.in_stock': 'In stock', 'store.out_of_stock': 'Out of stock',
            'store.cart': 'Cart', 'store.empty_cart': 'Your cart is empty', 'store.total': 'Total',
            'store.checkout': 'Checkout', 'store.remove': 'Remove', 'store.quantity': 'Quantity',
            'store.back_to_store': 'Back to store', 'store.back': 'Back', 'store.product_not_found': 'Product not found'
        }
    },
    be: {
        name: 'Беларуская',
        t: {
            'nav.home': 'Галоўная', 'nav.shop': 'Крама', 'nav.accounts': 'Акаўнты',
            'menu.account_editor': 'Рэдактар акаўнта', 'menu.settings': 'Налады', 'menu.logout': 'Выйсці',
            'home.welcome': 'Сардэчна запрашаем у HyoJoy', 'home.subtitle': 'Выберыце раздзел у меню зверху',
            'settings.title': 'Налады', 'settings.theme': 'Тэма афармлення', 'settings.language': 'Мова',
            'settings.saved': 'Захавана', 'settings.reset': 'Скінуць налады', 'settings.back': 'Назад',
            'auth.login': 'Уваход', 'auth.register': 'Рэгістрацыя',
            'auth.nick': 'Нік', 'auth.password': 'Пароль', 'auth.password2': 'Паўтарыце пароль',
            'auth.enter_nick': 'Увядзіце нік', 'auth.enter_pass': 'Увядзіце пароль',
            'auth.create_nick': 'Прыдумайце нік', 'auth.create_pass': 'Прыдумайце пароль', 'auth.repeat_pass': 'Паўтарыце пароль',
            'auth.login_btn': 'Увайсці', 'auth.register_btn': 'Зарэгістравацца',
            'users.title': 'Усе акаўнты', 'users.num': '#', 'users.nick': 'Нік',
            'users.tag': 'Тэг (UID)', 'users.date': 'Дата рэгістрацыі',
            'users.total': 'Усяго акаўнтаў', 'users.loading': 'Загрузка...',
            'users.empty': 'Пакуль няма акаўнтаў', 'users.back': 'Назад',
            'account.title': 'Рэдактар акаўнта',
            'account.change_nick': 'Змена ніка', 'account.change_pass': 'Змена пароля',
            'account.new_nick': 'Новы нік', 'account.current_pass': 'Бягучы пароль',
            'account.new_pass': 'Новы пароль', 'account.repeat_new_pass': 'Паўтарыце новы пароль',
            'account.confirm_pass': 'Пароль для пацверджання',
            'account.change_nick_btn': 'Змяніць нік', 'account.change_pass_btn': 'Змяніць пароль', 'account.back': 'Назад',
            'store.title': 'Крама', 'store.add_to_cart': 'Дадаць у кошык', 'store.added': 'Дададзена',
            'store.in_stock': 'У наяўнасці', 'store.out_of_stock': 'Няма ў наяўнасці',
            'store.cart': 'Кошык', 'store.empty_cart': 'Кошык пусты', 'store.total': 'Разам',
            'store.checkout': 'Аформіць заказ', 'store.remove': 'Выдаліць', 'store.quantity': 'Колькасць',
            'store.back_to_store': 'Назад у краму', 'store.back': 'Назад', 'store.product_not_found': 'Тавар не знойдзены'
        }
    },
    zh: {
        name: '中文',
        t: {
            'nav.home': '首页', 'nav.shop': '商店', 'nav.accounts': '账户',
            'menu.account_editor': '账户编辑', 'menu.settings': '设置', 'menu.logout': '退出登录',
            'home.welcome': '欢迎来到 HyoJoy', 'home.subtitle': '请从上方菜单选择',
            'settings.title': '设置', 'settings.theme': '主题', 'settings.language': '语言',
            'settings.saved': '已保存', 'settings.reset': '重置设置', 'settings.back': '返回',
            'auth.login': '登录', 'auth.register': '注册',
            'auth.nick': '昵称', 'auth.password': '密码', 'auth.password2': '重复密码',
            'auth.enter_nick': '请输入昵称', 'auth.enter_pass': '请输入密码',
            'auth.create_nick': '设置昵称', 'auth.create_pass': '设置密码', 'auth.repeat_pass': '重复密码',
            'auth.login_btn': '登录', 'auth.register_btn': '注册',
            'users.title': '所有账户', 'users.num': '#', 'users.nick': '昵称',
            'users.tag': '标签 (UID)', 'users.date': '注册时间',
            'users.total': '账户总数', 'users.loading': '加载中...',
            'users.empty': '暂无账户', 'users.back': '返回',
            'account.title': '账户编辑',
            'account.change_nick': '更改昵称', 'account.change_pass': '更改密码',
            'account.new_nick': '新昵称', 'account.current_pass': '当前密码',
            'account.new_pass': '新密码', 'account.repeat_new_pass': '重复新密码',
            'account.confirm_pass': '确认密码',
            'account.change_nick_btn': '更改昵称', 'account.change_pass_btn': '更改密码', 'account.back': '返回',
            'store.title': '商店', 'store.add_to_cart': '加入购物车', 'store.added': '已添加',
            'store.in_stock': '有货', 'store.out_of_stock': '缺货',
            'store.cart': '购物车', 'store.empty_cart': '购物车是空的', 'store.total': '总计',
            'store.checkout': '结账', 'store.remove': '删除', 'store.quantity': '数量',
            'store.back_to_store': '返回商店', 'store.back': '返回', 'store.product_not_found': '未找到产品'
        }
    }
};

const DEFAULT_SETTINGS = { theme: 'dark', lang: 'ru' };

export function loadSettings() {
    try {
        const raw = localStorage.getItem('hyojoy_settings');
        if (!raw) return { ...DEFAULT_SETTINGS };
        const s = JSON.parse(raw);
        return {
            theme: THEMES[s.theme] ? s.theme : DEFAULT_SETTINGS.theme,
            lang: LANGS[s.lang] ? s.lang : DEFAULT_SETTINGS.lang
        };
    } catch (e) {
        return { ...DEFAULT_SETTINGS };
    }
}

export function saveSettings(settings) {
    localStorage.setItem('hyojoy_settings', JSON.stringify(settings));
}

export function applyTheme(themeKey) {
    const theme = THEMES[themeKey] || THEMES.dark;
    const root = document.documentElement;
    for (const [k, v] of Object.entries(theme.vars)) {
        root.style.setProperty(k, v);
    }
}

export function applyLang(langKey) {
    const lang = LANGS[langKey] || LANGS.ru;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (lang.t[key]) {
            if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                el.placeholder = lang.t[key];
            } else {
                el.textContent = lang.t[key];
            }
        }
    });
    document.documentElement.lang = langKey;
}

export function initSettings() {
    const s = loadSettings();
    applyTheme(s.theme);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => applyLang(s.lang));
    } else {
        applyLang(s.lang);
    }
    return s;
}

// ===== Магазин =====
export const CURRENCIES = {
    ru: { code: 'RUB', symbol: '₽', rate: 100, position: 'after' },
    en: { code: 'USD', symbol: '$', rate: 1, position: 'before' },
    be: { code: 'BYN', symbol: 'Br', rate: 3.3, position: 'after' },
    zh: { code: 'CNY', symbol: '¥', rate: 7.2, position: 'before' }
};

export const PRODUCTS = [
    {
        id: 'zubochistki',
        image: 'images/store1.png',
        price: 1,
        stock: 100,
        category: 'home',
        title: {
            ru: 'Резиновые зубочистки',
            en: 'Rubber toothpicks',
            be: 'Гумавыя зубачысткі',
            zh: '橡胶牙签'
        },
        short: {
            ru: 'Многоразовые, гибкие, безопасные.',
            en: 'Reusable, flexible, safe.',
            be: 'Шматразовыя, гнуткія, бяспечныя.',
            zh: '可重复使用，灵活，安全。'
        },
        description: {
            ru: 'Резиновые зубочистки HyoJoy — это инновационное решение для гигиены полости рта. Изготовлены из мягкого пищевого силикона, безопасны для дёсен, легко моются и служат до 5 лет. Идеально подходят для дома и в поездках. В комплекте — удобный чехол. Цена указана за упаковку из 10 штук.',
            en: 'HyoJoy rubber toothpicks are an innovative oral hygiene solution. Made of soft food-grade silicone, they are safe for gums, easy to wash and last up to 5 years. Perfect for home and travel. Comes with a convenient case. Price is for a pack of 10 pcs.',
            be: 'Гумавыя зубачысткі HyoJoy — інавацыйнае рашэнне для гігіены поласці рота. Выраблены з мяккага харчовага сілікону, бяспечны для дзясен, лёгка мыюцца і служаць да 5 гадоў. Ідэальна падыходзяць для дома і ў паездках. У камплекце — зручны чахол. Цана за ўпакоўку з 10 штук.',
            zh: 'HyoJoy 橡胶牙签是一种创新的口腔卫生解决方案。采用柔软食品级硅胶制成，对牙龈安全，易于清洗，可使用长达 5 年。适合家庭和旅行使用。附带便携盒。价格为 10 支装。'
        }
    }
];

export function formatPrice(usdPrice, langKey) {
    const cur = CURRENCIES[langKey] || CURRENCIES.en;
    const value = usdPrice * cur.rate;
    let formatted;
    if (cur.code === 'RUB' || cur.code === 'CNY') {
        formatted = Math.round(value).toLocaleString('ru-RU');
    } else {
        formatted = value.toFixed(2);
    }
    if (cur.position === 'before') return `${cur.symbol}${formatted}`;
    return `${formatted} ${cur.symbol}`;
}

export function tStore(key, langKey) {
    const dict = LANGS[langKey] ? LANGS[langKey].t : LANGS.ru.t;
    return dict[key] || key;
}

const CART_KEY = 'hyojoy_cart';

export function getCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY) || '{}');
    } catch (e) { return {}; }
}

export function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function addToCart(productId, qty = 1) {
    const cart = getCart();
    cart[productId] = (cart[productId] || 0) + qty;
    saveCart(cart);
    return cart;
}

export function removeFromCart(productId) {
    const cart = getCart();
    delete cart[productId];
    saveCart(cart);
    return cart;
}

export function setCartQty(productId, qty) {
    const cart = getCart();
    if (qty <= 0) delete cart[productId];
    else cart[productId] = qty;
    saveCart(cart);
    return cart;
}

export function getCartCount() {
    const cart = getCart();
    return Object.values(cart).reduce((a, b) => a + b, 0);
}