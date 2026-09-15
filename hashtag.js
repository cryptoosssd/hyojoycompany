// ===== Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, doc, getDoc, collection, query, orderBy, limit, getDocs
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
let tag = '';
let authorsCache = {};

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function fmtDateTime(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const p = (x) => String(x).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function shortTag(uid) { return uid.slice(0, 8); }
function linkifyHashtags(text) {
    const safe = escapeHtml(text);
    return safe.replace(/#([a-zA-Zа-яА-ЯёЁ0-9_]{2,50})/g, (m, t) => {
        return `<a href="hashtag.html?tag=${encodeURIComponent(t.toLowerCase())}" class="hashtag" data-tag="${t.toLowerCase()}">#${t}</a>`;
    });
}

async function loadPosts() {
    const list = document.getElementById('posts-list');
    try {
        let snap;
        try {
            snap = await getDocs(query(collection(db, 'posts'), orderBy('ts', 'desc'), limit(500)));
        } catch (e) {
            snap = await getDocs(collection(db, 'posts'));
        }

        const allPosts = [];
        snap.forEach((d) => allPosts.push({ id: d.id, ...d.data() }));

        // Фильтр по хэштегу
        const filtered = allPosts.filter((p) => {
            const re = new RegExp('#' + tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
            return re.test(p.text || '');
        });
        filtered.sort((a, b) => (b.ts?.seconds || 0) - (a.ts?.seconds || 0));

        if (!filtered.length) {
            list.innerHTML = '<div class="empty">Постов с этим хэштегом нет</div>';
            document.getElementById('post-count').textContent = '0 постов';
            return;
        }

        // Загружаем авторов
        const uids = new Set(filtered.map((p) => p.authorUid));
        for (const uid of uids) {
            if (authorsCache[uid]) continue;
            try {
                const snapU = await getDoc(doc(db, 'users', uid));
                if (snapU.exists()) authorsCache[uid] = { uid, ...snapU.data() };
            } catch (e) {}
        }

        document.getElementById('post-count').textContent = `${filtered.length} постов`;

        list.innerHTML = filtered.map((p) => {
            const author = authorsCache[p.authorUid] || { nick: p.authorNick || '???', avatar: null };
            const nick = author.nick || '???';
            const avatar = author.avatar;
            const avatarInner = avatar
                ? `<img src="${avatar}" alt="">`
                : escapeHtml(nick.charAt(0).toUpperCase());
            const nickColor = author.nickColor || '';

            return `
                <div class="post-item">
                    <div class="post-avatar" onclick="location.href='profile.html?id=${p.authorUid}'">${avatarInner}</div>
                    <div class="post-body">
                        <div class="post-head">
                            <span class="post-author" onclick="location.href='profile.html?id=${p.authorUid}'" style="${nickColor ? 'color:' + nickColor : ''};cursor:pointer;">
                                ${escapeHtml(nick)}
                            </span>
                            <span class="post-tag">#${shortTag(p.authorUid)}</span>
                            <span class="post-date">${fmtDateTime(p.ts)}</span>
                        </div>
                        <div class="post-text">${linkifyHashtags(p.text)}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
        list.innerHTML = '<div class="empty">Ошибка: ' + e.message + '</div>';
    }
}

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    currentUser = user;

    const params = new URLSearchParams(window.location.search);
    tag = (params.get('tag') || '').toLowerCase();

    if (!tag) {
        document.getElementById('page-title').textContent = '#—';
        document.getElementById('posts-list').innerHTML = '<div class="empty">Хэштег не указан</div>';
        return;
    }

    document.title = '#' + tag + ' — HyoJoy';
    document.getElementById('page-title').textContent = '#' + tag;
    loadPosts();
});