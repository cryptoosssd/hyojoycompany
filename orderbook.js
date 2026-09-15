// ===== Стакан заявок =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, collection, query, where, onSnapshot, limit
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

let bids = []; // лимитные покупки
let asks = []; // лимитные продажи

function fmtMoney(n) {
    return '$' + Number(n).toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}

function subscribeOrderBook() {
    onSnapshot(collection(db, 'orders'), (snap) => {
        bids = [];
        asks = [];
        snap.forEach((d) => {
            const o = { id: d.id, ...d.data() };
            if (o.status !== 'active') return;
            if (o.type === 'limit_buy') bids.push(o);
            if (o.type === 'limit_sell') asks.push(o);
        });

        // Сортировка
        bids.sort((a, b) => b.price - a.price); // покупки: от высокой цены
        asks.sort((a, b) => a.price - b.price); // продажи: от низкой

        renderOrderBook();
    });
}

function renderOrderBook() {
    const bidsBox = document.getElementById('orderbook-bids');
    const asksBox = document.getElementById('orderbook-asks');
    const spreadBox = document.getElementById('orderbook-spread');
    if (!bidsBox || !asksBox) return;

    const topBids = bids.slice(0, 8);
    const topAsks = asks.slice(0, 8);

    bidsBox.innerHTML = topBids.length
        ? topBids.map((o) => `
            <div class="ob-row">
                <span class="ob-price up">${fmtMoney(o.price)}</span>
                <span class="ob-qty">${o.qty} шт.</span>
            </div>
        `).join('')
        : '<div class="ob-empty">Нет заявок</div>';

    asksBox.innerHTML = topAsks.length
        ? topAsks.map((o) => `
            <div class="ob-row">
                <span class="ob-price down">${fmtMoney(o.price)}</span>
                <span class="ob-qty">${o.qty} шт.</span>
            </div>
        `).join('')
        : '<div class="ob-empty">Нет заявок</div>';

    if (spreadBox) {
        const bestBid = topBids[0]?.price || 0;
        const bestAsk = topAsks[0]?.price || 0;
        if (bestBid && bestAsk) {
            const spread = bestAsk - bestBid;
            spreadBox.textContent = 'Спред: ' + fmtMoney(spread);
        } else {
            spreadBox.textContent = 'Спред: —';
        }
    }
}

onAuthStateChanged(auth, (user) => {
    if (!user) return;
    subscribeOrderBook();
});