// ===== Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, collection, getDocs, doc, updateDoc, serverTimestamp
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

const ONLINE_THRESHOLD = 2 * 60 * 1000; // 2 минуты
let currentUser = null;

// Обновление своего lastOnline
async function ping() {
    if (!currentUser) return;
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            lastOnline: serverTimestamp()
        });
    } catch (e) { console.error('ping:', e); }
}

// Подсчёт онлайн
async function countOnline() {
    try {
        const snap = await getDocs(collection(db, 'users'));
        const now = Date.now();
        const online = [];
        snap.forEach((d) => {
            const data = d.data();
            const last = data.lastOnline?.seconds ? data.lastOnline.seconds * 1000
                       : (data.lastOnline?.toDate ? data.lastOnline.toDate().getTime() : 0);
            if (now - last < ONLINE_THRESHOLD) {
                online.push({ uid: d.id, ...data });
            }
        });
        return online;
    } catch (e) {
        console.error('countOnline:', e);
        return [];
    }
}

// ===== UI =====
let widget = null;

function createWidget() {
    if (widget) return widget;
    widget = document.createElement('div');
    widget.id = 'hyojoy-online';
    widget.innerHTML = `
        <div class="online-pill" id="online-pill">
            <span class="online-dot"></span>
            <span class="online-count">...</span>
        </div>
        <div class="online-dropdown" id="online-dropdown">
            <div class="online-dropdown-title">Сейчас на сайте</div>
            <div class="online-list" id="online-list">
                <div class="online-empty">Загрузка...</div>
            </div>
        </div>
    `;
    document.body.appendChild(widget);

    // Стили
    const style = document.createElement('style');
    style.textContent = `
        #hyojoy-online {
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 9998;
            font-family: Arial, sans-serif;
        }
        .online-pill {
            background: #2a2a2a;
            border: 1px solid #3a3a3a;
            color: #e0e0e0;
            padding: 10px 16px;
            font-size: 12px;
            letter-spacing: 1px;
            text-transform: uppercase;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: 0.15s;
            user-select: none;
        }
        .online-pill:hover { background: #3a3a3a; border-color: #555; }
        .online-dot {
            width: 8px;
            height: 8px;
            background: #88cc88;
            border-radius: 50%;
            box-shadow: 0 0 8px #88cc88;
            animation: online-pulse 2s infinite;
        }
        @keyframes online-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }
        .online-count { color: #fff; font-weight: bold; }
        .online-dropdown {
            position: absolute;
            bottom: 50px;
            left: 0;
            background: #2a2a2a;
            border: 1px solid #3a3a3a;
            min-width: 240px;
            max-height: 300px;
            overflow-y: auto;
            display: none;
            flex-direction: column;
        }
        .online-dropdown.open { display: flex; }
        .online-dropdown-title {
            padding: 12px 16px;
            font-size: 11px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #999;
            border-bottom: 1px solid #3a3a3a;
            background: #1f1f1f;
            position: sticky;
            top: 0;
        }
        .online-list {
            display: flex;
            flex-direction: column;
        }
        .online-user {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            cursor: pointer;
            transition: 0.15s;
            border-bottom: 1px solid #333;
        }
        .online-user:last-child { border-bottom: none; }
        .online-user:hover { background: #3a3a3a; }
        .online-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #4a4a4a;
            border: 1px solid #555;
            color: #fff;
            font-size: 13px;
            font-weight: bold;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            text-transform: uppercase;
            flex-shrink: 0;
        }
        .online-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .online-nick { color: #fff; font-size: 13px; font-weight: bold; }
        .online-tag { color: #888; font-family: monospace; font-size: 10px; margin-left: auto; }
        .online-empty {
            padding: 20px;
            text-align: center;
            color: #888;
            font-size: 12px;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
    `;
    document.head.appendChild(style);

    // Клик по пилюле
    document.getElementById('online-pill').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('online-dropdown').classList.toggle('open');
    });
    document.addEventListener('click', () => {
        const dd = document.getElementById('online-dropdown');
        if (dd) dd.classList.remove('open');
    });

    return widget;
}

async function updateWidget() {
    createWidget();
    const online = await countOnline();
    document.querySelector('.online-count').textContent = online.length;

    const list = document.getElementById('online-list');
    if (!online.length) {
        list.innerHTML = '<div class="online-empty">Никого нет</div>';
        return;
    }

    list.innerHTML = online.map((u) => {
        const nick = u.nick || '???';
        const avatar = u.avatar;
        const avatarInner = avatar
            ? `<img src="${avatar}" alt="">`
            : nick.charAt(0).toUpperCase();
        const color = u.nickColor || '#ffffff';
        return `
            <div class="online-user" data-uid="${u.uid}">
                <div class="online-avatar">${avatarInner}</div>
                <div class="online-nick" style="color:${color}">${nick}</div>
                <div class="online-tag">#${u.uid.slice(0,8)}</div>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.online-user').forEach((el) => {
        el.addEventListener('click', () => {
            const uid = el.dataset.uid;
            if (uid === currentUser.uid) location.href = 'profile.html';
            else location.href = 'profile.html?id=' + uid;
        });
    });
}

// ===== Init =====
onAuthStateChanged(auth, (user) => {
    if (!user) return;
    currentUser = user;

    ping();
    updateWidget();

    // Пингуем каждые 30 сек
    setInterval(ping, 30000);
    // Обновляем список онлайн каждые 20 сек
    setInterval(updateWidget, 20000);
});