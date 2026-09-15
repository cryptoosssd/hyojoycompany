// ===== Уведомления HyoJoy =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, collection, query, orderBy, limit, onSnapshot, doc, where
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

// ===== Хранилище "последнего просмотренного" =====
// Храним в localStorage ключ "seen_{scope}_{chatId}" с timestamp
function getSeen(key) {
    const v = localStorage.getItem('hyojoy_seen_' + key);
    return v ? parseInt(v, 10) : 0;
}
function setSeen(key, ts) {
    localStorage.setItem('hyojoy_seen_' + key, String(ts));
}

// ===== UI уведомлений =====
let toastContainer = null;
function ensureContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = document.createElement('div');
    toastContainer.id = 'hyojoy-toasts';
    document.body.appendChild(toastContainer);
    // стили
    const style = document.createElement('style');
    style.textContent = `
        #hyojoy-toasts {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        }
        .hyojoy-toast {
            background: #2a2a2a;
            border: 1px solid #555;
            border-left: 4px solid #88cc88;
            color: #e0e0e0;
            padding: 14px 18px;
            min-width: 260px;
            max-width: 340px;
            font-family: Arial, sans-serif;
            font-size: 13px;
            pointer-events: auto;
            cursor: pointer;
            transition: 0.3s;
            transform: translateX(400px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        .hyojoy-toast.show { transform: translateX(0); }
        .hyojoy-toast .hyojoy-toast-title {
            font-weight: bold;
            color: #fff;
            font-size: 12px;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 6px;
        }
        .hyojoy-toast .hyojoy-toast-body {
            color: #ccc;
            font-size: 13px;
            line-height: 1.4;
            word-wrap: break-word;
        }
        .hyojoy-toast .hyojoy-toast-nick {
            color: #88cc88;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
    return toastContainer;
}

function showToast(title, nick, text, onClick) {
    const container = ensureContainer();
    const toast = document.createElement('div');
    toast.className = 'hyojoy-toast';
    toast.innerHTML = `
        <div class="hyojoy-toast-title">${title}</div>
        <div class="hyojoy-toast-body">
            <span class="hyojoy-toast-nick">${escapeHtml(nick || '???')}:</span>
            ${escapeHtml(text || '')}
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 20);

    if (onClick) {
        toast.addEventListener('click', () => {
            onClick();
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
    }

    // Автоскрытие через 6 секунд
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 6000);
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ===== Всплывашка разрешений на уведомления браузера =====
async function requestBrowserNotifications() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
        try {
            await Notification.requestPermission();
        } catch (e) {}
    }
}

function showBrowserNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible') return; // показываем только когда вкладка не активна
    try {
        new Notification(title, { body, icon: '/favicon.ico' });
    } catch (e) {}
}

// ===== Основная логика =====
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (!user) return;
    currentUser = user;
    subscribeGeneral();
    subscribeMyDMs();
    requestBrowserNotifications();
});

// ===== ОБЩИЙ ЧАТ =====
function subscribeGeneral() {
    const q = query(collection(db, 'forum_general'), orderBy('ts', 'desc'), limit(1));

    onSnapshot(q, (snap) => {
        snap.forEach((d) => {
            const m = { id: d.id, ...d.data() };
            const ts = m.ts && m.ts.toDate ? m.ts.toDate().getTime() : 0;
            const seen = getSeen('general');

            // Первый запуск — запомним текущее, ничего не показываем
            if (seen === 0) {
                setSeen('general', ts);
                return;
            }

            // Новое сообщение и не моё
            if (ts > seen && m.uid !== currentUser.uid) {
                const text = m.text || (m.file ? '[файл]' : '[сообщение]');
                showToast('Общий чат', m.nick || '???', text, () => {
                    window.location.href = 'forum.html';
                });
                showBrowserNotification('HyoJoy · Общий чат', (m.nick || '???') + ': ' + text);
                setSeen('general', ts);
            } else if (ts > seen) {
                // Своё — просто обновим seen
                setSeen('general', ts);
            }
        });
    }, (err) => console.error('notifications general:', err));
}

// ===== ЛИЧНЫЕ СООБЩЕНИЯ =====
// Подписываемся на все чаты, где я участник
function subscribeMyDMs() {
    // chatId имеет вид uid1_uid2 (отсортированные)
    // Нам нужно найти все документы forum_dm, где members содержит наш uid
    const q = query(collection(db, 'forum_dm'));

    onSnapshot(q, (snap) => {
        snap.forEach((chatDoc) => {
            const data = chatDoc.data();
            if (!Array.isArray(data.members)) return;
            if (!data.members.includes(currentUser.uid)) return;

            const chatId = chatDoc.id;
            subscribeChatMessages(chatId);
        });
    }, (err) => console.error('notifications dm list:', err));
}

// Подписки на конкретные чаты, чтобы не дублировать
const subscribedChats = new Set();

function subscribeChatMessages(chatId) {
    if (subscribedChats.has(chatId)) return;
    subscribedChats.add(chatId);

    const msgsRef = collection(db, 'forum_dm', chatId, 'messages');
    const q = query(msgsRef, orderBy('ts', 'desc'), limit(1));

    onSnapshot(q, (snap) => {
        snap.forEach((d) => {
            const m = { id: d.id, ...d.data() };
            const ts = m.ts && m.ts.toDate ? m.ts.toDate().getTime() : 0;
            const seen = getSeen('dm_' + chatId);

            if (seen === 0) {
                setSeen('dm_' + chatId, ts);
                return;
            }

            if (ts > seen && m.uid !== currentUser.uid) {
                const text = m.text || (m.file ? '[файл]' : '[сообщение]');
                showToast('Личное сообщение', m.nick || '???', text, () => {
                    window.location.href = 'forum.html';
                });
                showBrowserNotification('HyoJoy · Личное сообщение', (m.nick || '???') + ': ' + text);
                setSeen('dm_' + chatId, ts);
            } else if (ts > seen) {
                setSeen('dm_' + chatId, ts);
            }
        });
    }, (err) => console.error('notifications dm messages:', err));
}