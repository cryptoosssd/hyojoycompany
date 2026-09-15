// ===== Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, doc, getDoc, updateDoc, collection, query, where,
    getDocs, addDoc, deleteDoc, serverTimestamp, limit, orderBy
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
let followingIds = [];
let feedPosts = [];
let allPosts = [];
let authorsCache = {};

// ===== Утилиты =====
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
    return safe.replace(/#([a-zA-Zа-яА-ЯёЁ0-9_]{2,50})/g, (m, tag) => {
        return `<a href="hashtag.html?tag=${encodeURIComponent(tag.toLowerCase())}" class="hashtag" data-tag="${tag.toLowerCase()}">#${tag}</a>`;
    });
}
function hasHashtag(text) {
    return /#[a-zA-Zа-яА-ЯёЁ0-9_]{2,50}/.test(text || '');
}

// ===== Умная сортировка =====
// Формула: лайки × 10 + хэштег × 5 + свежесть + случайность
function postScore(p) {
    const likes = (p.likes || []).length;
    const hasTag = hasHashtag(p.text) ? 1 : 0;
    const ts = p.ts?.seconds ? p.ts.seconds * 1000 : Date.now();
    const hoursOld = (Date.now() - ts) / (1000 * 60 * 60);
    const freshness = Math.max(0, 30 - hoursOld);
    const random = Math.random() * 15;
    return likes * 10 + hasTag * 5 + freshness + random;
}

function sortPosts(posts) {
    return posts.slice().sort((a, b) => postScore(b) - postScore(a));
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

// ===== Подписки =====
async function loadFollowing() {
    try {
        const snap = await getDocs(
            query(collection(db, 'follows'), where('followerUid', '==', currentUser.uid))
        );
        followingIds = [currentUser.uid];
        snap.forEach((d) => {
            const f = d.data().followingUid;
            if (f && !followingIds.includes(f)) followingIds.push(f);
        });
    } catch (e) {
        console.error('loadFollowing:', e);
        followingIds = [currentUser.uid];
    }
}

// ===== Загрузка постов =====
async function loadAllPosts() {
    try {
        const q = query(collection(db, 'posts'), orderBy('ts', 'desc'), limit(200));
        const snap = await getDocs(q);
        allPosts = [];
        snap.forEach((d) => allPosts.push({ id: d.id, ...d.data() }));
    } catch (e) {
        console.warn('index missing, fallback:', e.message);
        const snap2 = await getDocs(collection(db, 'posts'));
        allPosts = [];
        snap2.forEach((d) => allPosts.push({ id: d.id, ...d.data() }));
        allPosts.sort((a, b) => (b.ts?.seconds || 0) - (a.ts?.seconds || 0));
    }

    // Авторы
    const uids = new Set(allPosts.map((p) => p.authorUid));
    for (const uid of uids) {
        if (authorsCache[uid]) continue;
        try {
            const snap = await getDoc(doc(db, 'users', uid));
            if (snap.exists()) authorsCache[uid] = { uid, ...snap.data() };
        } catch (e) {}
    }

    // Лента: подписки + мои
    feedPosts = allPosts.filter((p) => followingIds.includes(p.authorUid));

    // Умная сортировка
    feedPosts = sortPosts(feedPosts);
    allPosts = sortPosts(allPosts);

    renderFeed();
    renderAll();
}

// ===== Рендер поста =====
function renderPost(p) {
    const author = authorsCache[p.authorUid] || { nick: p.authorNick || '???', avatar: null };
    const nick = author.nick || '???';
    const avatar = author.avatar;
    const avatarInner = avatar
        ? `<img src="${avatar}" alt="">`
        : escapeHtml(nick.charAt(0).toUpperCase());
    const nickColor = author.nickColor || '';
    const likes = p.likes || [];
    const liked = currentUser && likes.includes(currentUser.uid);
    const canDelete = currentUser && p.authorUid === currentUser.uid;

    const textHtml = linkifyHashtags(p.text);

    return `
        <div class="post-item" data-post-id="${p.id}">
            <div class="post-avatar profile-link" data-uid="${p.authorUid}">${avatarInner}</div>
            <div class="post-body">
                <div class="post-head">
                    <span class="post-author profile-link" data-uid="${p.authorUid}" style="${nickColor ? 'color:' + nickColor : ''}">
                        ${escapeHtml(nick)}
                    </span>
                    <span class="post-tag">#${shortTag(p.authorUid)}</span>
                    <span class="post-date">${fmtDateTime(p.ts)}</span>
                </div>
                <div class="post-text">${textHtml}</div>
                <div class="post-actions">
                    <button class="post-like ${liked ? 'liked' : ''}" data-like-id="${p.id}">
                        ${liked ? '❤' : '♡'} <span>${likes.length}</span>
                    </button>
                    ${canDelete ? `<button class="post-delete" data-delete-id="${p.id}">Удалить</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

function attachHandlers(container) {
    container.querySelectorAll('.profile-link').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const uid = el.dataset.uid;
            if (uid === currentUser.uid) window.location.href = 'profile.html';
            else window.location.href = 'profile.html?id=' + uid;
        });
    });

    container.querySelectorAll('[data-like-id]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await toggleLike(btn.dataset.likeId);
        });
    });

    container.querySelectorAll('.post-delete').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm('Удалить пост?')) return;
            try {
                await deleteDoc(doc(db, 'posts', btn.dataset.deleteId));
                await refresh();
            } catch (e) { alert('Ошибка: ' + e.message); }
        });
    });

    container.querySelectorAll('.hashtag').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = 'hashtag.html?tag=' + encodeURIComponent(el.dataset.tag);
        });
    });
}

function renderFeed() {
    const box = document.getElementById('feed-list');
    if (!feedPosts.length) {
        box.innerHTML = '<div class="empty">Здесь пока нет постов. Подпишись на кого-то или напиши свой пост.</div>';
        return;
    }
    box.innerHTML = feedPosts.map(renderPost).join('');
    attachHandlers(box);
}

function renderAll() {
    const box = document.getElementById('all-list');
    if (!allPosts.length) {
        box.innerHTML = '<div class="empty">Постов пока нет</div>';
        return;
    }
    box.innerHTML = allPosts.map(renderPost).join('');
    attachHandlers(box);
}

// ===== Лайк =====
async function toggleLike(postId) {
    if (!currentUser) return;
    const post = allPosts.find((p) => p.id === postId);
    if (!post) return;
    const likes = post.likes || [];
    const liked = likes.includes(currentUser.uid);

    try {
        if (liked) {
            await updateDoc(doc(db, 'posts', postId), {
                likes: likes.filter((u) => u !== currentUser.uid)
            });
        } else {
            await updateDoc(doc(db, 'posts', postId), {
                likes: [...likes, currentUser.uid]
            });
        }
        await refresh();
    } catch (e) { alert('Ошибка: ' + e.message); }
}

// ===== Создание поста =====
document.getElementById('feed-send').addEventListener('click', async () => {
    if (!currentUser) return;
    const input = document.getElementById('feed-input');
    const text = input.value.trim();
    if (!text) return;

    const btn = document.getElementById('feed-send');
    btn.disabled = true;

    try {
        await addDoc(collection(db, 'posts'), {
            authorUid: currentUser.uid,
            authorNick: currentUser.displayName || currentUser.email.split('@')[0],
            authorTag: currentUser.uid.slice(0, 8),
            wallUid: currentUser.uid,
            text,
            likes: [],
            ts: serverTimestamp()
        });
        input.value = '';

        try {
            const usnap = await getDoc(doc(db, 'users', currentUser.uid));
            const curExp = usnap.exists() ? (usnap.data().exp || 0) : 0;
            await updateDoc(doc(db, 'users', currentUser.uid), { exp: curExp + 3 });
        } catch (e) {}

        await refresh();

        const msg = document.getElementById('feed-msg');
        msg.className = 'message success';
        msg.textContent = 'Опубликовано';
        setTimeout(() => msg.className = 'message', 2000);
    } catch (e) {
        console.error(e);
        const msg = document.getElementById('feed-msg');
        msg.className = 'message error';
        msg.textContent = 'Ошибка: ' + e.message;
        setTimeout(() => msg.className = 'message', 3000);
    }
    btn.disabled = false;
});

// ===== Refresh =====
async function refresh() {
    await loadFollowing();
    await loadAllPosts();
}

// ===== Init =====
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    currentUser = user;
    await refresh();
});