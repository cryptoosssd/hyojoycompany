// ===== Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, collection, addDoc, doc, getDoc, setDoc, updateDoc,
    onSnapshot, serverTimestamp, increment
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

// ===== Настройки =====
const START_PRICE = 500;
const DRIFT = 0.002;
const TICK_MS = 5000;
const TRADE_IMPACT = 0.0005;
const MAX_HISTORY = 500;
const MAX_SHARES = 20000000;
const MARKET_DOC = 'hyoj';
const START_BALANCE = 10000;

const TIMEFRAMES = {
    '1m':  { ms: 60 * 1000 },
    '1h':  { ms: 60 * 60 * 1000 },
    '1d':  { ms: 24 * 60 * 60 * 1000 },
    '1w':  { ms: 7 * 24 * 60 * 60 * 1000 },
    '1M':  { ms: 30 * 24 * 60 * 60 * 1000 },
    '1y':  { ms: 365 * 24 * 60 * 60 * 1000 }
};

let currentTF = '1h';
let marketHistory = [];
let currentPrice = START_PRICE;
let currentSold = 0;
let currentUser = null;
let userBalance = 0;
let userShares = 0;
let canvas = null;
let ctx = null;
let mouse = { x: null, y: null, inside: false };

// ===== Утилиты =====
function fmt(n, d = 2) {
    return Number(n).toLocaleString('en-US', {
        minimumFractionDigits: d, maximumFractionDigits: d
    });
}
function fmtMoney(n) { return '$' + fmt(n); }
function pad(x) { return String(x).padStart(2, '0'); }
function timeShort(ts) {
    const d = new Date(ts);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function timeFull(ts) {
    const d = new Date(ts);
    return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function timeOnly(ts) {
    const d = new Date(ts);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ===== Рынок =====
async function loadMarket() {
    const ref = doc(db, 'market', MARKET_DOC);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            price: START_PRICE,
            sold: 0,
            history: [],
            updatedAt: serverTimestamp()
        });
        marketHistory = [];
        currentPrice = START_PRICE;
        currentSold = 0;
        return;
    }
    const data = snap.data();
    currentPrice = Number(data.price || START_PRICE);
    currentSold = Number(data.sold || 0);
    marketHistory = Array.isArray(data.history) ? data.history : [];
}

function subscribeMarket() {
    const ref = doc(db, 'market', MARKET_DOC);
    onSnapshot(ref, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        currentPrice = Number(data.price || START_PRICE);
        currentSold = Number(data.sold || 0);
        marketHistory = Array.isArray(data.history) ? data.history : [];
        updateMarketUI();
        drawChart();
    }, (e) => console.error('market snapshot:', e));
}

// ===== Tick =====
async function tickMarket() {
    try {
        const ref = doc(db, 'market', MARKET_DOC);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const data = snap.data();
        const now = Date.now();
        const lastTs = data.updatedAt && data.updatedAt.toDate
            ? data.updatedAt.toDate().getTime() : 0;
        if (now - lastTs < TICK_MS * 0.9) return;

        let price = Number(data.price || START_PRICE);
        const drift = (Math.random() * 2 - 1) * DRIFT;
        price = price * (1 + drift);
        price = Math.max(1, Math.round(price * 100) / 100);

        let history = Array.isArray(data.history) ? data.history.slice() : [];
        const bucket = Math.floor(now / TIMEFRAMES['1m'].ms) * TIMEFRAMES['1m'].ms;
        const cur = history[history.length - 1];
        if (cur && cur.t === bucket) {
            cur.c = price;
            if (price > cur.h) cur.h = price;
            if (price < cur.l) cur.l = price;
        } else {
            history.push({ t: bucket, o: price, h: price, l: price, c: price });
            if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
        }

        await updateDoc(ref, {
            price,
            history,
            updatedAt: serverTimestamp()
        });
    } catch (e) {
        console.error('tickMarket:', e);
    }
}

// ===== Юзер =====
async function loadUser() {
    const ref = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    userBalance = Number(data.balanceUSD ?? START_BALANCE);
    userShares = Number(data.sharesHYOJ ?? 0);

    if (data.balanceUSD === undefined || data.sharesHYOJ === undefined) {
        await updateDoc(ref, {
            balanceUSD: userBalance,
            sharesHYOJ: userShares
        });
    }
    updateUserUI();
}

function subscribeUser() {
    const ref = doc(db, 'users', currentUser.uid);
    onSnapshot(ref, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        userBalance = Number(data.balanceUSD ?? START_BALANCE);
        userShares = Number(data.sharesHYOJ ?? 0);
        updateUserUI();
    });
}

// ===== Купить =====
async function buyShares() {
    const btn = document.getElementById('buy-btn');
    if (btn.disabled) return;
    btn.disabled = true;

    const qty = parseInt(document.getElementById('trade-qty').value, 10);
    if (!qty || qty < 1) {
        btn.disabled = false;
        return showMsg('trade-msg', 'Введите количество', 'error');
    }

    try {
        // Читаем актуальные данные пользователя и рынка
        const userRef = doc(db, 'users', currentUser.uid);
        const marketRef = doc(db, 'market', MARKET_DOC);

        const [userSnap, marketSnap] = await Promise.all([
            getDoc(userRef),
            getDoc(marketRef)
        ]);

        if (!userSnap.exists()) {
            btn.disabled = false;
            return showMsg('trade-msg', 'Профиль не найден', 'error');
        }
        if (!marketSnap.exists()) {
            btn.disabled = false;
            return showMsg('trade-msg', 'Рынок недоступен', 'error');
        }

        const realBalance = Number(userSnap.data().balanceUSD ?? START_BALANCE);
        const marketData = marketSnap.data();
        const realPrice = Number(marketData.price || START_PRICE);
        const realSold = Number(marketData.sold || 0);

        const cost = qty * realPrice;

        if (cost > realBalance) {
            btn.disabled = false;
            return showMsg('trade-msg',
                `Недостаточно средств. Баланс: ${fmtMoney(realBalance)}`, 'error');
        }

        if (realSold + qty > MAX_SHARES) {
            const left = MAX_SHARES - realSold;
            btn.disabled = false;
            return showMsg('trade-msg',
                left > 0
                    ? `Осталось только ${left.toLocaleString('ru-RU')} акций`
                    : 'Лимит акций исчерпан',
                'error');
        }

        // Обновляем пользователя и рынок
        await updateDoc(userRef, {
            balanceUSD: increment(-cost),
            sharesHYOJ: increment(qty)
        });

        const impact = 1 + TRADE_IMPACT * qty;
        const newPrice = Math.round(realPrice * impact * 100) / 100;

        await updateDoc(marketRef, {
            price: newPrice,
            sold: increment(qty)
        });

        const nick = currentUser.displayName || currentUser.email.split('@')[0];
        await addDoc(collection(db, 'trades'), {
            uid: currentUser.uid,
            nick,
            tag: currentUser.uid.slice(0, 8),
            type: 'buy',
            qty,
            price: realPrice,
            total: cost,
            ts: serverTimestamp()
        });

        showMsg('trade-msg', `Куплено ${qty} акций за ${fmtMoney(cost)}`, 'success');
    } catch (e) {
        console.error(e);
        showMsg('trade-msg', 'Ошибка: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

// ===== Продать =====
async function sellShares() {
    const btn = document.getElementById('sell-btn');
    if (btn.disabled) return;
    btn.disabled = true;

    const qty = parseInt(document.getElementById('trade-qty').value, 10);
    if (!qty || qty < 1) {
        btn.disabled = false;
        return showMsg('trade-msg', 'Введите количество', 'error');
    }

    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const marketRef = doc(db, 'market', MARKET_DOC);

        const [userSnap, marketSnap] = await Promise.all([
            getDoc(userRef),
            getDoc(marketRef)
        ]);

        if (!userSnap.exists()) {
            btn.disabled = false;
            return showMsg('trade-msg', 'Профиль не найден', 'error');
        }
        if (!marketSnap.exists()) {
            btn.disabled = false;
            return showMsg('trade-msg', 'Рынок недоступен', 'error');
        }

        const realShares = Number(userSnap.data().sharesHYOJ || 0);
        const marketData = marketSnap.data();
        const realPrice = Number(marketData.price || START_PRICE);

        if (qty > realShares) {
            btn.disabled = false;
            return showMsg('trade-msg',
                `Недостаточно акций. У вас ${realShares}`, 'error');
        }

        const revenue = qty * realPrice;

        await updateDoc(userRef, {
            balanceUSD: increment(revenue),
            sharesHYOJ: increment(-qty)
        });

        const impact = 1 - TRADE_IMPACT * qty;
        const newPrice = Math.round(realPrice * Math.max(0.5, impact) * 100) / 100;

        await updateDoc(marketRef, {
            price: newPrice,
            sold: increment(-qty)
        });

        const nick = currentUser.displayName || currentUser.email.split('@')[0];
        await addDoc(collection(db, 'trades'), {
            uid: currentUser.uid,
            nick,
            tag: currentUser.uid.slice(0, 8),
            type: 'sell',
            qty,
            price: realPrice,
            total: revenue,
            ts: serverTimestamp()
        });

        showMsg('trade-msg', `Продано ${qty} акций за ${fmtMoney(revenue)}`, 'success');
    } catch (e) {
        console.error(e);
        showMsg('trade-msg', 'Ошибка: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

function showMsg(id, text, type) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = 'message ' + type;
    setTimeout(() => { el.className = 'message'; }, 3000);
}

// ===== UI =====
function updateMarketUI() {
    document.getElementById('price').textContent = fmtMoney(currentPrice);
    document.getElementById('marketcap').textContent = '$' + Math.round(currentPrice * MAX_SHARES).toLocaleString('en-US');
    document.getElementById('updated').textContent = timeOnly(Date.now());

    const bucket = TIMEFRAMES[currentTF].ms;
    const fromTs = Date.now() - bucket;
    const inRange = marketHistory.filter((c) => c.t >= fromTs);
    const first = inRange.length ? inRange[0].o : currentPrice;
    const change = ((currentPrice - first) / first) * 100;

    const changeEl = document.getElementById('change');
    changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
    changeEl.className = 'change ' + (change >= 0 ? 'up' : 'down');

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const dayCandles = marketHistory.filter((c) => c.t >= dayAgo);
    if (dayCandles.length) {
        document.getElementById('high').textContent = fmtMoney(Math.max(...dayCandles.map((c) => c.h)));
        document.getElementById('low').textContent = fmtMoney(Math.min(...dayCandles.map((c) => c.l)));
    } else {
        document.getElementById('high').textContent = fmtMoney(currentPrice);
        document.getElementById('low').textContent = fmtMoney(currentPrice);
    }

    const remaining = Math.max(0, MAX_SHARES - currentSold);
    const remEl = document.getElementById('shares-remaining');
    if (remEl) remEl.textContent = remaining.toLocaleString('ru-RU');

    const qty = parseInt(document.getElementById('trade-qty').value, 10) || 0;
    document.getElementById('trade-cost').textContent = 'Итого: ' + fmtMoney(qty * currentPrice);
}

function updateUserUI() {
    document.getElementById('user-balance').textContent = fmtMoney(userBalance);
    document.getElementById('user-shares').textContent = userShares.toLocaleString('ru-RU');
    document.getElementById('portfolio-value').textContent = fmtMoney(userShares * currentPrice);
}

// ===== График =====
function resizeCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function buildCandles(bucketMs, slotsCount) {
    if (slotsCount < 1) return [];
    const now = Date.now();
    const rightBucket = Math.floor(now / bucketMs) * bucketMs;
    const leftBucket = rightBucket - (slotsCount - 1) * bucketMs;

    const map = new Map();
    for (let i = 0; i < slotsCount; i++) {
        map.set(leftBucket + i * bucketMs, null);
    }
    for (const c of marketHistory) {
        const bt = Math.floor(c.t / bucketMs) * bucketMs;
        if (bt < leftBucket || bt > rightBucket) continue;
        const cur = map.get(bt);
        if (!cur) {
            map.set(bt, { t: bt, o: c.o, h: c.h, l: c.l, c: c.c });
        } else {
            cur.c = c.c;
            if (c.h > cur.h) cur.h = c.h;
            if (c.l < cur.l) cur.l = c.l;
        }
    }
    const out = [];
    for (let i = 0; i < slotsCount; i++) {
        const bt = leftBucket + i * bucketMs;
        out.push({ t: bt, candle: map.get(bt) });
    }
    return out;
}

function drawChart() {
    if (!canvas || !ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const bucket = TIMEFRAMES[currentTF].ms;
    const padL = 10, padR = 90, padT = 20, padB = 34;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;
    const SLOT_PX = 56, CANDLE_PX = 18;
    const slotsCount = Math.max(3, Math.floor(chartW / SLOT_PX));

    const slots = buildCandles(bucket, slotsCount);
    const realCandles = slots.filter((s) => s.candle).map((s) => s.candle);

    if (realCandles.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '13px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Собираем данные...', w / 2, h / 2);
        return;
    }

    let min = Infinity, max = -Infinity;
    for (const c of realCandles) {
        if (c.l < min) min = c.l;
        if (c.h > max) max = c.h;
    }
    const padding = (max - min) * 0.08 || 1;
    min -= padding; max += padding;
    const range = max - min;

    const priceToY = (p) => padT + chartH * (1 - (p - min) / range);
    const yToPrice = (y) => max - ((y - padT) / chartH) * range;
    const usedW = slotsCount * SLOT_PX;
    const startX = padL + Math.max(0, chartW - usedW);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 6; i++) {
        const y = padT + (chartH / 6) * i;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + chartW, y);
        ctx.stroke();
        const price = max - (range / 6) * i;
        ctx.fillStyle = '#777';
        ctx.fillText('$' + fmt(price), padL + chartW + 8, y);
    }

    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (!slot.candle) continue;
        const c = slot.candle;
        const xCenter = startX + SLOT_PX * i + SLOT_PX / 2;
        if (xCenter < padL - SLOT_PX || xCenter > padL + chartW + SLOT_PX) continue;
        const up = c.c >= c.o;
        const color = up ? '#6ee7a8' : '#e07a7a';

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const x = Math.floor(xCenter) + 0.5;
        ctx.moveTo(x, priceToY(c.h));
        ctx.lineTo(x, priceToY(c.l));
        ctx.stroke();

        const yOpen = priceToY(c.o);
        const yClose = priceToY(c.c);
        const top = Math.min(yOpen, yClose);
        const bot = Math.max(yOpen, yClose);
        const bodyH = Math.max(3, bot - top);
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(xCenter - CANDLE_PX / 2), Math.floor(top), CANDLE_PX, Math.ceil(bodyH));
    }

    ctx.fillStyle = '#777';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const step = Math.max(1, Math.floor(slotsCount / 7));
    for (let i = 0; i < slots.length; i += step) {
        const xCenter = startX + SLOT_PX * i + SLOT_PX / 2;
        if (xCenter < padL || xCenter > padL + chartW) continue;
        ctx.fillText(timeShort(slots[i].t), xCenter, padT + chartH + 10);
    }

    if (mouse.inside && mouse.x >= padL && mouse.x <= padL + chartW && mouse.y >= padT && mouse.y <= padT + chartH) {
        const relX = mouse.x - startX;
        const idx = Math.floor(relX / SLOT_PX);
        if (idx >= 0 && idx < slots.length) {
            const slot = slots[idx];
            const xCenter = startX + SLOT_PX * idx + SLOT_PX / 2;

            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(xCenter, padT);
            ctx.lineTo(xCenter, padT + chartH);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(padL, mouse.y);
            ctx.lineTo(padL + chartW, mouse.y);
            ctx.stroke();
            ctx.setLineDash([]);

            const priceAtCursor = yToPrice(mouse.y);
            ctx.fillStyle = '#3a3a3a';
            ctx.strokeStyle = '#666';
            ctx.fillRect(padL + chartW + 2, mouse.y - 10, 84, 20);
            ctx.strokeRect(padL + chartW + 2, mouse.y - 10, 84, 20);
            ctx.fillStyle = '#fff';
            ctx.font = '11px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('$' + fmt(priceAtCursor), padL + chartW + 8, mouse.y);

            if (slot.candle) {
                const c = slot.candle;
                const isUp = c.c >= c.o;
                const info = `${timeFull(c.t)}   O ${fmt(c.o)}   H ${fmt(c.h)}   L ${fmt(c.l)}   C ${fmt(c.c)}`;
                ctx.font = '11px Arial';
                const tw = ctx.measureText(info).width + 20;
                ctx.fillStyle = 'rgba(0,0,0,0.75)';
                ctx.fillRect(padL + 6, padT + 6, tw, 22);
                ctx.fillStyle = isUp ? '#6ee7a8' : '#e07a7a';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(info, padL + 16, padT + 17);

                ctx.beginPath();
                ctx.arc(xCenter, priceToY(c.c), 3.5, 0, Math.PI * 2);
                ctx.fillStyle = isUp ? '#6ee7a8' : '#e07a7a';
                ctx.fill();
            }
        }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('HYOJ · ' + currentTF.toUpperCase(), padL + 2, padT + chartH + 10);
}

// ===== Init =====
window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('chart');
    ctx = canvas.getContext('2d');
    resizeCanvas();

    document.querySelectorAll('.tf-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tf-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            currentTF = btn.dataset.tf;
            drawChart();
        });
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.inside = true;
        drawChart();
    });
    canvas.addEventListener('mouseleave', () => {
        mouse.inside = false;
        drawChart();
    });

    document.getElementById('trade-qty').addEventListener('input', updateMarketUI);

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'auth.html';
            return;
        }
        currentUser = user;

        await loadMarket();
        await loadUser();

        subscribeMarket();
        subscribeUser();

        updateMarketUI();
        updateUserUI();
        drawChart();

        document.getElementById('buy-btn').addEventListener('click', buyShares);
        document.getElementById('sell-btn').addEventListener('click', sellShares);

        setInterval(tickMarket, TICK_MS);
        setTimeout(tickMarket, 1000);
    });
});

window.addEventListener('resize', () => {
    resizeCanvas();
    drawChart();
});