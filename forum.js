// ===== Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, collection, addDoc, query, orderBy, limit,
    onSnapshot, getDocs, doc, setDoc, updateDoc,
    serverTimestamp, arrayUnion, arrayRemove
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

const EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '😢', '👎'];

let currentUser = null;
let currentNick = '';
let currentTag = '';
let dmUnsub = null;
let currentDMUser = null;
let allUsers = [];
let userData = {};   // uid -> { avatar, status, statusColor, nickColor, verified }
let generalReply = null;
let dmReply = null;

// ===== Утилиты =====
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function fmtTime(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const p = (x) => String(x).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}`;
}
function shortTag(uid) { return uid.slice(0, 8); }
function dmChatId(a, b) { return [a, b].sort().join('_'); }

function avatarInner(uid, nick) {
    const u = userData[uid] || {};
    if (u.avatar) return `<img src="${u.avatar}" alt="">`;
    const ch = (nick || '?').charAt(0).toUpperCase();
    return escapeHtml(ch);
}

function verifiedSvg() {
    return `<svg viewBox="0 0 24 24" fill="#a0c4ff" xmlns="http://www.w3.org/2000/svg" style="width:14px;height:14px;vertical-align:-2px;">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
    </svg>`;
}

function getNickStyle(uid) {
    const u = userData[uid] || {};
    if (u.nickColor) return `color:${u.nickColor}`;
    return '';
}
function isVerified(uid) {
    return !!(userData[uid] && userData[uid].verified);
}
function getStatusLine(uid) {
    const u = userData[uid] || {};
    if (!u.status) return '';
    const color = u.statusColor || '#a0c4ff';
    return `<div class="msg-status" style="color:${color}">${escapeHtml(u.status)}</div>`;
}

// ===== Табы =====
document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    });
});

// ===== Рендер сообщения =====
function renderMsg(container, msg, isOwn, scope, msgId, chatId) {
    const row = document.createElement('div');
    row.className = 'msg-row' + (isOwn ? ' own' : '');
    row.dataset.msgId = msgId;
    row.dataset.scope = scope;
    if (chatId) row.dataset.chatId = chatId;

    let replyQuote = '';
    if (msg.replyTo && msg.replyTo.nick) {
        replyQuote = `
            <div class="msg-reply-quote">
                <span class="quote-nick">${escapeHtml(msg.replyTo.nick)}</span>
                <span class="quote-text">${escapeHtml(msg.replyTo.text || '')}</span>
            </div>
        `;
    }

    let reactionsHtml = '';
    const reactions = msg.reactions || {};
    const reactionKeys = Object.keys(reactions).filter((k) => reactions[k] && reactions[k].length);
    if (reactionKeys.length) {
        reactionsHtml = '<div class="msg-reactions">' + reactionKeys.map((emoji) => {
            const users = reactions[emoji] || [];
            const mine = users.includes(currentUser.uid);
            return `<div class="reaction-chip ${mine ? 'mine' : ''}" data-reaction="${emoji}">
                <span>${emoji}</span>
                <span class="count">${users.length}</span>
            </div>`;
        }).join('') + '</div>';
    }

    const pinned = msg.pinned === true;

    row.innerHTML = `
        <div class="msg-avatar">${avatarInner(msg.uid, msg.nick)}</div>
        <div class="msg ${pinned ? 'pinned' : ''}">
            ${replyQuote}
            <div class="msg-head">
                <span class="msg-nick" style="${getNickStyle(msg.uid)}">
                    ${escapeHtml(msg.nick || '???')}
                    ${isVerified(msg.uid) ? verifiedSvg() : ''}
                </span>
                <span class="msg-tag">#${escapeHtml(msg.tag || '')}</span>
                <span class="msg-time">${fmtTime(msg.ts)}</span>
            </div>
            ${getStatusLine(msg.uid)}
            <div class="msg-text">${escapeHtml(msg.text)}</div>
            ${reactionsHtml}
            <div class="msg-actions">
                <button class="msg-action-btn" data-action="reply">Ответить</button>
                <button class="msg-action-btn" data-action="react">Эмодзи</button>
                <button class="msg-action-btn ${pinned ? 'pin-active' : ''}" data-action="pin">
                    ${pinned ? 'Открепить' : 'Закрепить'}
                </button>
            </div>
        </div>
    `;

    container.appendChild(row);

    row.querySelectorAll('.reaction-chip').forEach((chip) => {
        chip.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleReaction(scope, chatId, msgId, chip.dataset.reaction);
        });
    });

    row.querySelector('[data-action="reply"]').addEventListener('click', (e) => {
        e.stopPropagation();
        setReply(scope, { msgId, chatId, uid: msg.uid, nick: msg.nick || '???', text: msg.text });
    });

    row.querySelector('[data-action="react"]').addEventListener('click', (e) => {
        e.stopPropagation();
        openEmojiPicker(row.querySelector('.msg'), scope, chatId, msgId);
    });

    row.querySelector('[data-action="pin"]').addEventListener('click', (e) => {
        e.stopPropagation();
        togglePin(scope, chatId, msgId, !pinned);
    });
}

// ===== Закрепить/открепить =====
async function togglePin(scope, chatId, msgId, pin) {
    try {
        let ref;
        if (scope === 'general') {
            ref = doc(db, 'forum_general', msgId);
        } else {
            ref = doc(db, 'forum_dm', chatId, 'messages', msgId);
        }
        await updateDoc(ref, { pinned: pin });
    } catch (e) {
        console.error('togglePin failed:', e);
        alert('Не удалось изменить закреп: ' + e.message);
    }
}

// ===== Панель закрепов (общий чат) =====
function renderPinned(boxId, messages) {
    const box = document.getElementById(boxId);
    const pinned = messages.filter((m) => m.pinned === true);
    if (!pinned.length) {
        box.classList.remove('active');
        box.innerHTML = '';
        return;
    }
    box.classList.add('active');
    box.innerHTML = pinned.map((m) => `
        <div class="pinned-item" data-msg-id="${m.id}">
            <span class="pin-label">📌 Закреп</span>
            <span class="pin-nick">${escapeHtml(m.nick || '???')}:</span>
            <span class="pin-text">${escapeHtml(m.text)}</span>
        </div>
    `).join('');

    box.querySelectorAll('.pinned-item').forEach((el) => {
        el.addEventListener('click', () => {
            const target = document.querySelector(`[data-msg-id="${el.dataset.msgId}"]`);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const msg = target.querySelector('.msg');
                if (msg) {
                    msg.style.background = 'rgba(136,204,136,0.2)';
                    setTimeout(() => msg.style.background = '', 1000);
                }
            }
        });
    });
}

// ===== Эмодзи =====
function openEmojiPicker(container, scope, chatId, msgId) {
    document.querySelectorAll('.emoji-picker').forEach((p) => p.remove());
    const picker = document.createElement('div');
    picker.className = 'emoji-picker';
    picker.innerHTML = EMOJIS.map((e) => `<button data-emoji="${e}">${e}</button>`).join('');
    container.appendChild(picker);

    picker.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleReaction(scope, chatId, msgId, btn.dataset.emoji);
            picker.remove();
        });
    });

    setTimeout(() => {
        const closeHandler = (ev) => {
            if (!picker.contains(ev.target)) {
                picker.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 0);
}

// ===== Реакции =====
async function toggleReaction(scope, chatId, msgId, emoji) {
    try {
        let ref;
        if (scope === 'general') {
            ref = doc(db, 'forum_general', msgId);
        } else {
            ref = doc(db, 'forum_dm', chatId, 'messages', msgId);
        }

        const chip = document.querySelector(`[data-msg-id="${msgId}"] .reaction-chip[data-reaction="${emoji}"]`);
        const mine = chip && chip.classList.contains('mine');

        if (mine) {
            await updateDoc(ref, { [`reactions.${emoji}`]: arrayRemove(currentUser.uid) });
        } else {
            await updateDoc(ref, { [`reactions.${emoji}`]: arrayUnion(currentUser.uid) });
        }
    } catch (e) {
        console.error('toggleReaction failed:', e);
        alert('Не удалось поставить реакцию: ' + e.message);
    }
}

// ===== Ответы =====
function setReply(scope, data) {
    if (scope === 'general') {
        generalReply = data;
        document.getElementById('general-reply-nick').textContent = data.nick;
        document.getElementById('general-reply-text').textContent = data.text;
        document.getElementById('general-reply-preview').classList.add('active');
        document.getElementById('general-input').focus();
    } else {
        dmReply = data;
        document.getElementById('dm-reply-nick').textContent = data.nick;
        document.getElementById('dm-reply-text').textContent = data.text;
        document.getElementById('dm-reply-preview').classList.add('active');
        document.getElementById('dm-input').focus();
    }
}
function clearReply(scope) {
    if (scope === 'general') {
        generalReply = null;
        document.getElementById('general-reply-preview').classList.remove('active');
    } else {
        dmReply = null;
        document.getElementById('dm-reply-preview').classList.remove('active');
    }
}

// ===== ОБЩИЙ ЧАТ =====
async function sendGeneral() {
    const input = document.getElementById('general-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    const payload = {
        uid: currentUser.uid,
        nick: currentNick,
        tag: currentTag,
        text,
        pinned: false,
        ts: serverTimestamp()
    };
    if (generalReply) {
        payload.replyTo = { uid: generalReply.uid, nick: generalReply.nick, text: generalReply.text };
    }
    clearReply('general');

    try {
        await addDoc(collection(db, 'forum_general'), payload);
    } catch (e) {
        console.error(e);
        alert('Не удалось отправить: ' + e.message);
    }
}

function subscribeGeneral() {
    const q = query(collection(db, 'forum_general'), orderBy('ts', 'asc'), limit(200));
    onSnapshot(q, (snap) => {
        const box = document.getElementById('general-messages');
        box.innerHTML = '';
        const msgs = [];
        snap.forEach((d) => msgs.push({ id: d.id, ...d.data() }));

        renderPinned('general-pinned', msgs);

        if (msgs.length === 0) {
            box.innerHTML = '<div class="empty-chat">Сообщений пока нет</div>';
            return;
        }

        msgs.forEach((m) => {
            renderMsg(box, m, m.uid === currentUser.uid, 'general', m.id, null);
        });
        box.scrollTop = box.scrollHeight;
    }, (err) => {
        console.error(err);
        document.getElementById('general-messages').innerHTML =
            '<div class="empty-chat">Ошибка: ' + err.message + '</div>';
    });
}

// ===== ЛИЧКА =====
async function loadAllUsers() {
    try {
        const snap = await getDocs(collection(db, 'users'));
        allUsers = [];
        snap.forEach((d) => {
            const data = d.data();
            userData[d.id] = {
                avatar: data.avatar || null,
                status: data.status || '',
                statusColor: data.statusColor || '#a0c4ff',
                nickColor: data.nickColor || '',
                verified: !!data.verified
            };
            if (d.id === currentUser.uid) return;
            allUsers.push({ uid: d.id, nick: data.nick || '???', tag: shortTag(d.id) });
        });
        renderUserList(allUsers);
    } catch (e) {
        console.error(e);
        document.getElementById('dm-users-list').innerHTML =
            '<div class="empty-chat" style="padding:20px">Ошибка: ' + e.message + '</div>';
    }
}

function renderUserList(list) {
    const box = document.getElementById('dm-users-list');
    box.innerHTML = '';
    if (!list.length) {
        box.innerHTML = '<div class="empty-chat" style="padding:20px">Ничего не найдено</div>';
        return;
    }
    list.forEach((u) => {
        const el = document.createElement('div');
        el.className = 'dm-user';
        el.dataset.uid = u.uid;
        el.innerHTML = `
            <div class="dm-avatar">${avatarInner(u.uid, u.nick)}</div>
            <div class="dm-info">
                <div class="nick" style="${getNickStyle(u.uid)}">
                    ${escapeHtml(u.nick)}
                    ${isVerified(u.uid) ? verifiedSvg() : ''}
                </div>
                ${getStatusLine(u.uid)}
                <div class="tag">#${u.tag}</div>
            </div>
            <button class="write-btn">Написать</button>
        `;
        el.addEventListener('click', () => openDM(u.uid, u.nick));
        box.appendChild(el);
    });
}

function filterUsers(q) {
    const s = q.trim().toLowerCase();
    if (!s) return renderUserList(allUsers);
    const query = s.replace('#', '');
    const filtered = allUsers.filter((u) =>
        u.nick.toLowerCase().includes(s) || u.tag.toLowerCase().includes(query)
    );
    renderUserList(filtered);
}

function openDM(theirUid, theirNick) {
    currentDMUser = { uid: theirUid, nick: theirNick };
    document.querySelectorAll('.dm-user').forEach((el) => {
        el.classList.toggle('active', el.dataset.uid === theirUid);
    });
    document.getElementById('dm-head-text').textContent =
        'Чат с ' + theirNick + '  ·  #' + shortTag(theirUid);
    document.getElementById('dm-back').style.display = 'inline-block';
    document.getElementById('dm-composer').style.display = 'flex';
    clearReply('dm');

    if (dmUnsub) { dmUnsub(); dmUnsub = null; }

    const chatId = dmChatId(currentUser.uid, theirUid);
    const msgsRef = collection(db, 'forum_dm', chatId, 'messages');
    const q = query(msgsRef, orderBy('ts', 'asc'), limit(200));

    dmUnsub = onSnapshot(q, (snap) => {
        const box = document.getElementById('dm-messages');
        box.innerHTML = '';
        const msgs = [];
        snap.forEach((d) => msgs.push({ id: d.id, ...d.data() }));

        const pinned = msgs.filter((m) => m.pinned === true);
        if (pinned.length) {
            const bar = document.createElement('div');
            bar.className = 'pinned-bar active';
            bar.style.marginBottom = '12px';
            bar.innerHTML = pinned.map((m) => `
                <div class="pinned-item">
                    <span class="pin-label">📌</span>
                    <span class="pin-nick">${escapeHtml(m.nick)}:</span>
                    <span class="pin-text">${escapeHtml(m.text)}</span>
                </div>
            `).join('');
            box.appendChild(bar);
        }

        if (msgs.length === 0) {
            box.innerHTML = '<div class="empty-chat">Сообщений пока нет</div>';
            return;
        }

        msgs.forEach((m) => renderMsg(box, m, m.uid === currentUser.uid, 'dm', m.id, chatId));
        box.scrollTop = box.scrollHeight;
    }, (err) => {
        console.error(err);
        document.getElementById('dm-messages').innerHTML =
            '<div class="empty-chat">Ошибка: ' + err.message + '</div>';
    });
}

function closeDM() {
    currentDMUser = null;
    if (dmUnsub) { dmUnsub(); dmUnsub = null; }
    clearReply('dm');
    document.getElementById('dm-head-text').textContent = 'Выберите собеседника';
    document.getElementById('dm-back').style.display = 'none';
    document.getElementById('dm-composer').style.display = 'none';
    document.getElementById('dm-messages').innerHTML =
        '<div class="empty-chat">Найдите пользователя и нажмите «Написать»</div>';
    document.querySelectorAll('.dm-user').forEach((el) => el.classList.remove('active'));
}

async function sendDM() {
    if (!currentDMUser) return;
    const input = document.getElementById('dm-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    const chatId = dmChatId(currentUser.uid, currentDMUser.uid);
    const payload = {
        uid: currentUser.uid,
        nick: currentNick,
        tag: currentTag,
        text,
        pinned: false,
        ts: serverTimestamp()
    };
    if (dmReply) {
        payload.replyTo = { uid: dmReply.uid, nick: dmReply.nick, text: dmReply.text };
    }
    clearReply('dm');

    try {
        await setDoc(doc(db, 'forum_dm', chatId), {
            members: [currentUser.uid, currentDMUser.uid],
            lastTs: serverTimestamp()
        }, { merge: true });
        await addDoc(collection(db, 'forum_dm', chatId, 'messages'), payload);
    } catch (e) {
        console.error(e);
        alert('Не удалось отправить: ' + e.message);
    }
}

// ===== Init =====
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    currentUser = user;
    currentNick = user.displayName || user.email.split('@')[0];
    currentTag = shortTag(user.uid);

    await loadAllUsers();
    subscribeGeneral();

    document.getElementById('general-send').addEventListener('click', sendGeneral);
    document.getElementById('general-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendGeneral();
    });
    document.getElementById('general-reply-cancel').addEventListener('click', () => clearReply('general'));

    document.getElementById('dm-send').addEventListener('click', sendDM);
    document.getElementById('dm-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendDM();
    });
    document.getElementById('dm-reply-cancel').addEventListener('click', () => clearReply('dm'));
    document.getElementById('dm-search').addEventListener('input', (e) => filterUsers(e.target.value));
    document.getElementById('dm-back').addEventListener('click', closeDM);
});