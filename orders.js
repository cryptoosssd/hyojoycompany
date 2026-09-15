// ===== Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, collection, addDoc, query, where, orderBy, limit,
    onSnapshot, getDocs, doc, getDoc, updateDoc, deleteDoc,
    serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCUSTTJhonzZPOKWUbe_qMZfMmVyFSxjPE",
    authDomain: "hyojoy-41840.firebaseapp.com",
    projectId: "hyojoy-41840",
    storageBucket: "hyojoy-41840.firebasestorage.app",
    messagingSenderId: "714253431446",
    appId: "1:714253431446:web:fe08e2cbe51c768dfd48b7",
    measurementId: "G-DQ3F2VMTCJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentPrice = 500;
let currentShares = 0;
let currentBalance = 0;
let myOrders = [];
let executedOrders = [];

const TRADE_IMPACT = 0.0005;

// ===== Утилиты =====
function fmtMoney(n) {
    return '$' + Number(n).toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}
function fmtDate(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const p = (x) => String(x).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function showMsg(text, type) {
    const el = document.getElementById('create-msg');
    el.textContent = text;
    el.className = 'message ' + type;
    setTimeout(() => { el.className = 'message'; }, 4000);
}

// ===== Подписка на рынок =====
function subscribeMarket() {
    onSnapshot(doc(db, 'market', 'hyoj'), (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        currentPrice = Number(d.price || 500);
        document.getElementById('current-price').textContent = fmtMoney(currentPrice);
        checkOrders();
    });
}

function subscribeUser() {
    onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        currentShares = Number(d.sharesHYOJ || 0);
        currentBalance = Number(d.balanceUSD || 0);
        document.getElementById('user-balance').textContent = fmtMoney(currentBalance);
        document.getElementById('user-shares').textContent = currentShares.toLocaleString('ru-RU');
    });
}

function subscribeOrders() {
    const q = query(
        collection(db, 'orders'),
        where('uid', '==', currentUser.uid),
        orderBy('ts', 'desc'),
        limit(100)
    );

    onSnapshot(q, (snap) => {
        myOrders = [];
        snap.forEach((d) => myOrders.push({ id: d.id, ...d.data() }));
        renderOrders();
        checkOrders();
    }, (err) => {
        // fallback без orderBy
        getDocs(query(collection(db, 'orders'), where('uid', '==', currentUser.uid)))
            .then((snap2) => {
                myOrders = [];
                snap2.forEach((d) => myOrders.push({ id: d.id, ...d.data() }));
                myOrders.sort((a, b) => (b.ts?.seconds || 0) - (a.ts?.seconds || 0));
                renderOrders();
                checkOrders();
            });
    });
}

// ===== Создание ордера =====
document.getElementById('create-btn').addEventListener('click', async () => {
    const type = document.getElementById('order-type').value;
    const qty = parseInt(document.getElementById('order-qty').value, 10);
    const price = parseFloat(document.getElementById('order-price').value);

    if (!qty || qty < 1) return showMsg('Введите количество', 'error');
    if (!price || price <= 0) return showMsg('Введите цену', 'error');

    // Проверки
    if (type === 'limit_buy') {
        // При лимитной покупке нужно зарезервировать деньги
        const cost = qty * price;
        if (cost > currentBalance) {
            return showMsg('Недостаточно средств: нужно ' + fmtMoney(cost), 'error');
        }
    }
    if (type === 'limit_sell' || type === 'stop_loss' || type === 'take_profit') {
        if (qty > currentShares) {
            return showMsg('Недостаточно акций: у вас ' + currentShares, 'error');
        }
    }

    const btn = document.getElementById('create-btn');
    btn.disabled = true;

    try {
        await addDoc(collection(db, 'orders'), {
            uid: currentUser.uid,
            nick: currentUser.displayName || currentUser.email.split('@')[0],
            type,
            qty,
            price,     // целевая цена
            status: 'active',
            ts: serverTimestamp()
        });
        showMsg('Ордер создан', 'success');
        document.getElementById('order-qty').value = '1';
    } catch (e) {
        console.error(e);
        showMsg('Ошибка: ' + e.message, 'error');
    }
    btn.disabled = false;
});

// ===== Проверка и исполнение ордеров =====
let executing = false;

async function checkOrders() {
    if (executing) return;
    if (!currentUser) return;

    executing = true;
    try {
        const active = myOrders.filter((o) => o.status === 'active');
        for (const order of active) {
            let shouldExecute = false;

            if (order.type === 'limit_buy' && currentPrice <= order.price) {
                shouldExecute = true;
            } else if (order.type === 'limit_sell' && currentPrice >= order.price) {
                shouldExecute = true;
            } else if (order.type === 'stop_loss' && currentPrice <= order.price) {
                shouldExecute = true;
            } else if (order.type === 'take_profit' && currentPrice >= order.price) {
                shouldExecute = true;
            }

            if (shouldExecute) {
                await executeOrder(order);
            }
        }
    } finally {
        executing = false;
    }
}

async function executeOrder(order) {
    try {
        // Перечитать свежие данные
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        const realShares = Number(userData.sharesHYOJ || 0);
        const realBalance = Number(userData.balanceUSD || 0);

        const cost = order.qty * currentPrice;

        // Проверяем возможность исполнения
        const isBuy = order.type === 'limit_buy';
        const isSell = order.type === 'limit_sell' || order.type === 'stop_loss' || order.type === 'take_profit';

        if (isBuy && cost > realBalance) {
            // Отменяем ордер — недостаточно средств
            await updateDoc(doc(db, 'orders', order.id), {
                status: 'cancelled',
                cancelReason: 'Недостаточно средств'
            });
            return;
        }

        if (isSell && order.qty > realShares) {
            await updateDoc(doc(db, 'orders', order.id), {
                status: 'cancelled',
                cancelReason: 'Недостаточно акций'
            });
            return;
        }

        // Исполняем
        const marketRef = doc(db, 'market', 'hyoj');

        if (isBuy) {
            await updateDoc(userRef, {
                balanceUSD: increment(-cost),
                sharesHYOJ: increment(order.qty)
            });
            const impact = 1 + TRADE_IMPACT * order.qty;
            const newPrice = Math.round(currentPrice * impact * 100) / 100;
            await updateDoc(marketRef, { price: newPrice });
        } else {
            await updateDoc(userRef, {
                balanceUSD: increment(cost),
                sharesHYOJ: increment(-order.qty)
            });
            const impact = 1 - TRADE_IMPACT * order.qty;
            const newPrice = Math.round(currentPrice * Math.max(0.5, impact) * 100) / 100;
            await updateDoc(marketRef, { price: newPrice });
        }

        // Запись в trades
        await addDoc(collection(db, 'trades'), {
            uid: currentUser.uid,
            nick: order.nick,
            tag: currentUser.uid.slice(0, 8),
            type: isBuy ? 'buy' : 'sell',
            qty: order.qty,
            price: currentPrice,
            total: cost,
            ts: serverTimestamp(),
            source: 'order'
        });

        // Помечаем ордер исполненным
        await updateDoc(doc(db, 'orders', order.id), {
            status: 'executed',
            executedAt: serverTimestamp(),
            executedPrice: currentPrice
        });

    } catch (e) {
        console.error('executeOrder error:', e);
    }
}

// ===== Отмена ордера =====
window.cancelOrder = async function(id) {
    if (!confirm('Отменить ордер?')) return;
    try {
        await updateDoc(doc(db, 'orders', id), {
            status: 'cancelled',
            cancelledAt: serverTimestamp()
        });
    } catch (e) {
        alert('Ошибка: ' + e.message);
    }
};

// ===== Рендер ордеров =====
function renderOrders() {
    const active = myOrders.filter((o) => o.status === 'active');
    const history = myOrders.filter((o) => o.status !== 'active');

    const activeBox = document.getElementById('orders-list');
    if (!active.length) {
        activeBox.innerHTML = '<div class="empty">Нет активных ордеров</div>';
    } else {
        activeBox.innerHTML = active.map(renderOrderRow).join('');
    }

    const histBox = document.getElementById('history-list');
    if (!history.length) {
        histBox.innerHTML = '<div class="empty">Пока пусто</div>';
    } else {
        histBox.innerHTML = history.slice(0, 30).map((o) => renderOrderRow(o, true)).join('');
    }
}

function renderOrderRow(o, showStatus = false) {
    const typeLabels = {
        'limit_buy': 'Лимит покупка',
        'limit_sell': 'Лимит продажа',
        'stop_loss': 'Stop-loss',
        'take_profit': 'Take-profit'
    };
    const typeClass = o.type === 'limit_buy' ? 'buy'
                    : o.type === 'limit_sell' ? 'sell'
                    : 'stop';

    const statusLabels = {
        'active': 'Активен',
        'executed': 'Исполнен',
        'cancelled': 'Отменён'
    };

    const cancelBtn = o.status === 'active'
        ? `<button class="order-cancel" onclick="cancelOrder('${o.id}')">Отменить</button>`
        : '';

    return `
        <div class="order-row">
            <div class="order-type ${typeClass}">${typeLabels[o.type] || o.type}</div>
            <div class="order-qty">${o.qty} шт.</div>
            <div class="order-price">${fmtMoney(o.price)}</div>
            <div class="order-target">
                ${o.status === 'executed' && o.executedPrice
                    ? fmtMoney(o.executedPrice)
                    : fmtMoney(o.price)}
            </div>
            <div class="order-status ${o.status}">${statusLabels[o.status] || o.status}${o.cancelReason ? ' · ' + o.cancelReason : ''}</div>
            ${cancelBtn}
        </div>
    `;
}

// ===== Init =====
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    currentUser = user;
    subscribeMarket();
    subscribeUser();
    subscribeOrders();

    // Периодическая проверка (на случай, если onSnapshot не дёрнул)
    setInterval(checkOrders, 5000);
});