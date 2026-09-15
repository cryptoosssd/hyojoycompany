// ===== Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, collection, query, where, orderBy, limit,
    onSnapshot, doc, getDocs
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
let allTrades = [];
let allUsersCache = [];

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
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function shortTag(uid) { return uid.slice(0, 8); }

// ===== Табы =====
document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    });
});

// ===== Подписки =====
function subscribeMarket() {
    onSnapshot(doc(db, 'market', 'hyoj'), (snap) => {
        if (!snap.exists()) return;
        currentPrice = Number(snap.data().price || 500);
        updateUI();
        renderRatings();
    });
}

function subscribeUser() {
    onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        currentBalance = Number(d.balanceUSD || 0);
        currentShares = Number(d.sharesHYOJ || 0);
        updateUI();
    });
}

function subscribeTrades() {
    const q = query(
        collection(db, 'trades'),
        where('uid', '==', currentUser.uid),
        orderBy('ts', 'desc'),
        limit(200)
    );
    onSnapshot(q, (snap) => {
        allTrades = [];
        snap.forEach((d) => allTrades.push({ id: d.id, ...d.data() }));
        renderTrades();
        updateUI();
    }, (err) => {
        console.warn('index missing, fallback:', err.message);
        getDocs(query(collection(db, 'trades'), where('uid', '==', currentUser.uid)))
            .then((snap2) => {
                allTrades = [];
                snap2.forEach((d) => allTrades.push({ id: d.id, ...d.data() }));
                allTrades.sort((a, b) => (b.ts?.seconds || 0) - (a.ts?.seconds || 0));
                renderTrades();
                updateUI();
            });
    });
}

// ===== Средняя цена =====
function calcAvgPrice() {
    let totalQty = 0, totalCost = 0;
    allTrades.forEach((t) => {
        if (t.type === 'buy') {
            totalQty += Number(t.qty || 0);
            totalCost += Number(t.total || 0);
        }
    });
    return totalQty === 0 ? 0 : totalCost / totalQty;
}

// ===== Обновить UI =====
function updateUI() {
    document.getElementById('balance').textContent = fmtMoney(currentBalance);
    document.getElementById('shares').textContent = currentShares.toLocaleString('ru-RU');
    document.getElementById('shares-value').textContent = '≈ ' + fmtMoney(currentShares * currentPrice);
    document.getElementById('current-price').textContent = fmtMoney(currentPrice);

    const avg = calcAvgPrice();
    document.getElementById('avg-price').textContent = fmtMoney(avg);

    const profit = (currentShares * currentPrice) - (currentShares * avg);
    const pct = (avg * currentShares) > 0 ? (profit / (avg * currentShares)) * 100 : 0;

    const pEl = document.getElementById('profit');
    const ptEl = document.getElementById('profit-pct');
    pEl.textContent = (profit >= 0 ? '+' : '') + fmtMoney(profit);
    ptEl.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
    pEl.className = 'card-value ' + (profit >= 0 ? 'up' : 'down');
    ptEl.className = 'card-sub ' + (pct >= 0 ? 'up' : 'down');
}

// ===== История сделок =====
function renderTrades() {
    const box = document.getElementById('trades-list');
    if (!allTrades.length) {
        box.innerHTML = '<div class="empty">Сделок пока нет</div>';
        return;
    }
    box.innerHTML = allTrades.map((t) => {
        const typeClass = t.type === 'buy' ? 'buy' : 'sell';
        const typeLabel = t.type === 'buy' ? 'Покупка' : 'Продажа';
        return `
            <div class="trade-row">
                <div class="trade-type ${typeClass}">${typeLabel}</div>
                <div class="trade-qty">${t.qty} шт.</div>
                <div class="trade-price">${fmtMoney(t.price || 0)}</div>
                <div class="trade-total">${fmtMoney(t.total || 0)}</div>
                <div class="trade-date">${fmtDate(t.ts)}</div>
            </div>
        `;
    }).join('');
}

// ===== Рейтинги =====
async function loadUsersCache() {
    try {
        const snap = await getDocs(collection(db, 'users'));
        allUsersCache = [];
        snap.forEach((d) => allUsersCache.push({ uid: d.id, ...d.data() }));
        renderRatings();
    } catch (e) {
        console.error(e);
    }
}

function renderRatings() {
    const withCapital = allUsersCache.map((u) => {
        const shares = Number(u.sharesHYOJ || 0);
        const balance = Number(u.balanceUSD || 0);
        const capital = shares * currentPrice + balance;
        return { ...u, capital, shares, balance };
    });
    withCapital.sort((a, b) => b.capital - a.capital);
    renderRich(withCapital.slice(0, 20));

    const withProfit = allUsersCache.map((u) => {
        const shares = Number(u.sharesHYOJ || 0);
        const balance = Number(u.balanceUSD || 0);
        const profit = shares * currentPrice + balance - 10000;
        return { ...u, profit, shares, balance };
    });
    withProfit.sort((a, b) => b.profit - a.profit);
    renderTraders(withProfit.slice(0, 20));
}

function renderRich(list) {
    const box = document.getElementById('rich-list');
    if (!list.length) {
        box.innerHTML = '<div class="empty">Пока никого</div>';
        return;
    }
    box.innerHTML = list.map((u, i) => renderRankRow(u, i, u.capital, 'капитал')).join('');
}

function renderTraders(list) {
    const box = document.getElementById('traders-list');
    if (!list.length) {
        box.innerHTML = '<div class="empty">Пока никого</div>';
        return;
    }
    box.innerHTML = list.map((u, i) => renderRankRow(u, i, u.profit, 'прибыль', true)).join('');
}

function renderRankRow(u, i, value, label, isProfit) {
    const nick = u.nick || '???';
    const avatar = u.avatar
        ? `<img src="${u.avatar}" alt="">`
        : escapeHtml(nick.charAt(0).toUpperCase());
    const isMe = currentUser && u.uid === currentUser.uid;
    const sign = isProfit && value > 0 ? '+' : '';
    const color = isProfit && value < 0 ? 'var(--danger)' : 'var(--success)';
    return `
        <div class="rank-row ${isMe ? 'me' : ''}">
            <div class="rank-num">${i + 1}</div>
            <div class="rank-avatar" onclick="event.stopPropagation();location.href='profile.html?id=${u.uid}'" style="cursor:pointer;">${avatar}</div>
            <div class="rank-info">
                <div class="rank-nick" style="${u.nickColor ? 'color:' + u.nickColor : ''};cursor:pointer;" onclick="event.stopPropagation();location.href='profile.html?id=${u.uid}'">
                    ${escapeHtml(nick)}
                    ${u.verified ? '✓' : ''}
                </div>
                <div class="rank-tag">#${shortTag(u.uid)}</div>
            </div>
            <div class="rank-value" style="color:${color}">${sign}${fmtMoney(value)}</div>
            <div class="rank-label">${label}</div>
        </div>
    `;
}

// ===== Init =====
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    currentUser = user;

    subscribeMarket();
    subscribeUser();
    subscribeTrades();
    await loadUsersCache();

    setInterval(loadUsersCache, 10000);
});