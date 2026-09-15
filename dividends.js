// ===== Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, collection, addDoc, query, where, orderBy, limit,
    onSnapshot, getDocs, doc, getDoc, updateDoc, setDoc,
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
let dividendRate = 0.005;
let dividendEnabled = true;
let lastDividendTs = 0;
let allBonds = [];
let myBonds = [];

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
function daysBetween(a, b) {
    return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}
function showMsg(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'message ' + type;
    setTimeout(() => { el.className = 'message'; }, 4000);
}

// ===== Вкладки =====
document.querySelectorAll('.itab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.itab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.ipanel').forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('ipanel-' + tab.dataset.itab).classList.add('active');
    });
});

// ===== Подписки =====
function subscribeMarket() {
    onSnapshot(doc(db, 'market', 'hyoj'), (snap) => {
        if (!snap.exists()) return;
        currentPrice = Number(snap.data().price || 500);
        updateDividendUI();
    });
}

function subscribeUser() {
    onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        currentShares = Number(d.sharesHYOJ || 0);
        currentBalance = Number(d.balanceUSD || 0);
        lastDividendTs = d.lastDividendTs ? (d.lastDividendTs.toDate ? d.lastDividendTs.toDate().getTime() : d.lastDividendTs) : 0;
        updateDividendUI();
    });
}

function subscribeConfig() {
    onSnapshot(doc(db, 'config', 'main'), (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        dividendRate = Number(d.dividendRate ?? 0.005);
        dividendEnabled = d.dividendEnabled !== false;
        updateDividendUI();
    });
}

// ===== Дивиденды: UI =====
function updateDividendUI() {
    document.getElementById('dv-rate').textContent = (dividendRate * 100).toFixed(2) + '%';
    document.getElementById('dv-shares').textContent = currentShares.toLocaleString('ru-RU');
    document.getElementById('dv-value').textContent = fmtMoney(currentShares * currentPrice);
    document.getElementById('dv-daily').textContent = fmtMoney(currentShares * currentPrice * dividendRate);

    const statusEl = document.getElementById('dv-status');
    if (!dividendEnabled) {
        statusEl.textContent = 'Отключено';
        statusEl.className = 'dv-status off';
    } else {
        statusEl.textContent = 'Активно';
        statusEl.className = 'dv-status';
    }

    // Кнопка
    const btn = document.getElementById('dv-claim');
    const now = Date.now();
    const daysPassed = lastDividendTs ? daysBetween(lastDividendTs, now) : 999;

    if (!dividendEnabled) {
        btn.disabled = true;
        btn.textContent = 'Дивиденды отключены';
    } else if (currentShares === 0) {
        btn.disabled = true;
        btn.textContent = 'Нет акций';
    } else if (daysPassed < 1) {
        btn.disabled = true;
        const hours = Math.ceil((24 - (now - lastDividendTs) / 3600000));
        btn.textContent = `Доступно через ${hours}ч`;
    } else {
        btn.disabled = false;
        const amount = currentShares * currentPrice * dividendRate * Math.min(daysPassed, 7);
        btn.textContent = `Получить ${fmtMoney(amount)}`;
    }
}

// ===== Получить дивиденды =====
document.getElementById('dv-claim').addEventListener('click', async () => {
    if (!currentUser || !dividendEnabled) return;
    if (currentShares === 0) return;

    const now = Date.now();
    const daysPassed = lastDividendTs ? daysBetween(lastDividendTs, now) : 0;
    if (daysPassed < 1) return;

    // Максимум 7 дней накапливается
    const effectiveDays = Math.min(daysPassed, 7);
    const amount = currentShares * currentPrice * dividendRate * effectiveDays;

    const btn = document.getElementById('dv-claim');
    btn.disabled = true;

    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            balanceUSD: increment(amount),
            lastDividendTs: serverTimestamp()
        });

        await addDoc(collection(db, 'dividends'), {
            uid: currentUser.uid,
            amount,
            shares: currentShares,
            price: currentPrice,
            days: effectiveDays,
            ts: serverTimestamp()
        });

        showMsg('dv-msg', `Получено ${fmtMoney(amount)}`, 'success');
    } catch (e) {
        console.error(e);
        showMsg('dv-msg', 'Ошибка: ' + e.message, 'error');
    }
    btn.disabled = false;
});

// ===== История дивидендов =====
function subscribeDividendHistory() {
    const q = query(
        collection(db, 'dividends'),
        where('uid', '==', currentUser.uid),
        orderBy('ts', 'desc'),
        limit(50)
    );
    onSnapshot(q, (snap) => {
        const box = document.getElementById('dv-history');
        const items = [];
        snap.forEach((d) => items.push(d.data()));
        if (!items.length) {
            box.innerHTML = '<div class="empty">Выплат пока нет</div>';
            return;
        }
        box.innerHTML = items.map((h) => `
            <div class="dv-row">
                <div class="dv-amount">+${fmtMoney(h.amount)}</div>
                <div class="dv-info-cell">${h.shares} акций × ${fmtMoney(h.price)} · ${h.days}д</div>
                <div class="dv-date">${fmtDate(h.ts)}</div>
            </div>
        `).join('');
    }, (err) => {
        // fallback
        getDocs(query(collection(db, 'dividends'), where('uid', '==', currentUser.uid)))
            .then((snap2) => {
                const items = [];
                snap2.forEach((d) => items.push(d.data()));
                items.sort((a, b) => (b.ts?.seconds || 0) - (a.ts?.seconds || 0));
                const box = document.getElementById('dv-history');
                if (!items.length) {
                    box.innerHTML = '<div class="empty">Выплат пока нет</div>';
                    return;
                }
                box.innerHTML = items.slice(0, 50).map((h) => `
                    <div class="dv-row">
                        <div class="dv-amount">+${fmtMoney(h.amount)}</div>
                        <div class="dv-info-cell">${h.shares} акций × ${fmtMoney(h.price)} · ${h.days}д</div>
                        <div class="dv-date">${fmtDate(h.ts)}</div>
                    </div>
                `).join('');
            });
    });
}

// ===== Облигации =====
function subscribeBonds() {
    onSnapshot(collection(db, 'bonds'), (snap) => {
        allBonds = [];
        snap.forEach((d) => allBonds.push({ id: d.id, ...d.data() }));
        allBonds.sort((a, b) => (a.price || 0) - (b.price || 0));
        renderBonds();
    });
}

function renderBonds() {
    const box = document.getElementById('bonds-list');
    if (!allBonds.length) {
        box.innerHTML = '<div class="empty">Нет доступных облигаций</div>';
        return;
    }
    box.innerHTML = allBonds.map((b) => {
        const profit = b.price * b.rate;
        const canBuy = currentBalance >= b.price && b.available !== false;
        return `
            <div class="bond-card ${b.available === false ? 'disabled' : ''}">
                <div class="bond-name">${escapeHtml(b.name || 'Облигация')}</div>
                <div class="bond-stats">
                    <div class="bond-stat">
                        <span class="bs-label">Цена</span>
                        <span class="bs-value">${fmtMoney(b.price)}</span>
                    </div>
                    <div class="bond-stat">
                        <span class="bs-label">Срок</span>
                        <span class="bs-value">${b.days} дн.</span>
                    </div>
                    <div class="bond-stat">
                        <span class="bs-label">Доходность</span>
                        <span class="bs-value profit">${(b.rate * 100).toFixed(2)}%</span>
                    </div>
                    <div class="bond-stat">
                        <span class="bs-label">Получите</span>
                        <span class="bs-value profit">${fmtMoney(b.price + profit)}</span>
                    </div>
                </div>
                <button class="bond-buy" data-id="${b.id}" ${!canBuy ? 'disabled' : ''}>
                    ${currentBalance < b.price ? 'Недостаточно средств' : (b.available === false ? 'Недоступно' : 'Купить')}
                </button>
            </div>
        `;
    }).join('');

    box.querySelectorAll('.bond-buy').forEach((btn) => {
        btn.addEventListener('click', () => buyBond(btn.dataset.id));
    });
}

async function buyBond(bondId) {
    const bond = allBonds.find((b) => b.id === bondId);
    if (!bond) return;

    try {
        // Перечитать баланс
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
        const realBalance = Number(userSnap.data().balanceUSD || 0);
        if (realBalance < bond.price) {
            alert('Недостаточно средств');
            return;
        }

        const now = new Date();
        const endTs = new Date(now.getTime() + bond.days * 24 * 60 * 60 * 1000);
        const payout = bond.price * (1 + bond.rate);

        // Списываем деньги
        await updateDoc(doc(db, 'users', currentUser.uid), {
            balanceUSD: increment(-bond.price)
        });

        // Создаём user_bond
        await addDoc(collection(db, 'user_bonds'), {
            uid: currentUser.uid,
            bondId: bond.id,
            name: bond.name || 'Облигация',
            price: bond.price,
            payout,
            startTs: serverTimestamp(),
            endTs: endTs,
            claimed: false
        });

        alert('Облигация куплена!');
    } catch (e) {
        console.error(e);
        alert('Ошибка: ' + e.message);
    }
}

// ===== Мои облигации =====
function subscribeMyBonds() {
    onSnapshot(query(collection(db, 'user_bonds'), where('uid', '==', currentUser.uid)), (snap) => {
        myBonds = [];
        snap.forEach((d) => myBonds.push({ id: d.id, ...d.data() }));
        myBonds.sort((a, b) => (b.startTs?.seconds || 0) - (a.startTs?.seconds || 0));
        renderMyBonds();
    });
}

function renderMyBonds() {
    const box = document.getElementById('my-bonds-list');
    if (!myBonds.length) {
        box.innerHTML = '<div class="empty">Пока нет</div>';
        return;
    }
    const now = Date.now();
    box.innerHTML = myBonds.map((b) => {
        const start = b.startTs?.seconds ? b.startTs.seconds * 1000 : now;
        const end = b.endTs?.seconds ? b.endTs.seconds * 1000 : (b.endTs?.getTime?.() || now);
        const total = end - start;
        const passed = Math.max(0, Math.min(now - start, total));
        const progress = Math.min(100, Math.round((passed / total) * 100));
        const isReady = now >= end;
        const claimed = b.claimed;

        return `
            <div class="bond-card ${claimed ? 'disabled' : ''}">
                <div class="bond-name">${escapeHtml(b.name)}</div>
                <div class="bond-stats">
                    <div class="bond-stat">
                        <span class="bs-label">Вложено</span>
                        <span class="bs-value">${fmtMoney(b.price)}</span>
                    </div>
                    <div class="bond-stat">
                        <span class="bs-label">К получению</span>
                        <span class="bs-value profit">${fmtMoney(b.payout)}</span>
                    </div>
                    <div class="bond-stat">
                        <span class="bs-label">Осталось</span>
                        <span class="bs-value">${claimed ? '—' : (isReady ? 'Готово' : Math.ceil((end - now) / (1000 * 60 * 60)) + 'ч')}</span>
                    </div>
                </div>
                <div class="bond-progress"><div class="bond-progress-bar" style="width:${progress}%"></div></div>
                <button class="bond-claim" data-id="${b.id}" ${!isReady || claimed ? 'disabled' : ''}>
                    ${claimed ? 'Получено' : (isReady ? 'Получить ' + fmtMoney(b.payout) : 'Ждать')}
                </button>
            </div>
        `;
    }).join('');

    box.querySelectorAll('.bond-claim').forEach((btn) => {
        btn.addEventListener('click', () => claimBond(btn.dataset.id));
    });
}

async function claimBond(id) {
    const b = myBonds.find((x) => x.id === id);
    if (!b || b.claimed) return;

    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            balanceUSD: increment(b.payout)
        });
        await updateDoc(doc(db, 'user_bonds', id), {
            claimed: true,
            claimedAt: serverTimestamp()
        });
        alert('Получено ' + fmtMoney(b.payout));
    } catch (e) {
        console.error(e);
        alert('Ошибка: ' + e.message);
    }
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
    subscribeConfig();
    subscribeDividendHistory();
    subscribeBonds();
    subscribeMyBonds();
});