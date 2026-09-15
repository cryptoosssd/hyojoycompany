// ===== Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, collection, query, orderBy, limit, onSnapshot, doc
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

// ===== Настройки компании =====
const COMPANY = {
    name: 'HyoJoy Corporation',
    shares: 20000000,          // 20 млн акций
    ownerNick: 'OwnerAndLeader',
    ownerTag: '#luLEQpYL'   // ← впиши тег овнера (первые 8 символов UID)
};

// ===== Утилиты =====
function fmtMoney(n) {
    return '$' + Number(n).toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}
function fmtShares(n) {
    return Number(n).toLocaleString('ru-RU') + ' акций';
}
function fmtTime(ts) {
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

// ===== Капитал (из курса акции + счётчик проданных) =====
function subscribeMarket() {
    const ref = doc(db, 'market', 'hyoj');
    onSnapshot(ref, (snap) => {
        const capEl = document.getElementById('capital');
        const capSharesEl = document.getElementById('capital-shares');
        const soldEl = document.getElementById('shares-sold');
        const leftEl = document.getElementById('shares-left');

        if (!snap.exists()) {
            if (capEl) capEl.textContent = '$0.00';
            if (capSharesEl) capSharesEl.textContent = fmtShares(COMPANY.shares);
            if (soldEl) soldEl.textContent = '0';
            if (leftEl) leftEl.textContent = 'из ' + COMPANY.shares.toLocaleString('ru-RU');
            return;
        }
        const data = snap.data();
        const price = Number(data.price || 500);
        const sold = Number(data.sold || 0);
        const total = COMPANY.shares;

        if (capEl) capEl.textContent = fmtMoney(price * total);
        if (capSharesEl) capSharesEl.textContent = fmtShares(total);
        if (soldEl) soldEl.textContent = sold.toLocaleString('ru-RU');
        if (leftEl) leftEl.textContent = 'из ' + total.toLocaleString('ru-RU');
    }, (err) => {
        console.error('market snapshot error:', err);
    });
}

// ===== Init =====
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }

    document.getElementById('owner-nick').textContent = COMPANY.ownerNick;
    document.getElementById('owner-tag').textContent = COMPANY.ownerTag;

    subscribeMarket();
    subscribeSales();
});

// ===== Продажи товаров =====
function subscribeSales() {
    const q = query(collection(db, 'sales'), orderBy('ts', 'desc'), limit(100));
    onSnapshot(q, (snap) => {
        let totalCount = 0;
        let totalRevenue = 0;
        const rows = [];

        snap.forEach((d) => {
            const s = d.data();
            const items = Array.isArray(s.items) ? s.items : [];
            let qty = 0;
            items.forEach((it) => qty += (it.qty || 0));
            totalCount += qty;
            totalRevenue += Number(s.total || 0);

            rows.push({
                buyerNick: s.buyerNick || '???',
                buyerTag: s.buyerTag || '--------',
                qty,
                total: Number(s.total || 0),
                ts: s.ts
            });
        });

        document.getElementById('total-sold').textContent = totalCount.toLocaleString('ru-RU');
        document.getElementById('total-revenue').textContent = fmtMoney(totalRevenue);

        renderRecent(rows.slice(0, 8));
    }, (err) => {
        console.error('sales snapshot error:', err);
    });
}

function renderRecent(rows) {
    const box = document.getElementById('recent-sales');
    if (!rows.length) {
        box.innerHTML = '<div class="empty">Пока нет продаж</div>';
        return;
    }
    box.innerHTML = rows.map((r) => `
        <div class="sale-row">
            <div class="sale-left">
                <span class="sale-buyer">${escapeHtml(r.buyerNick)}</span>
                <span class="sale-tag">#${escapeHtml(r.buyerTag)} · ${r.qty} шт.</span>
            </div>
            <div class="sale-right">
                <span class="sale-price">${fmtMoney(r.total)}</span>
                <span class="sale-time">${fmtTime(r.ts)}</span>
            </div>
        </div>
    `).join('');
}
