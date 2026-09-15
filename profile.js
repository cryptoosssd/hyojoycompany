// ===== Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, doc, getDoc, updateDoc, collection, query, where,
    getDocs, addDoc, deleteDoc, setDoc, serverTimestamp, limit, orderBy
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
let viewedUid = null;
let viewedData = null;
let isOwnProfile = false;
let commentsCache = [];
let usersCacheForComments = {};
let postsCache = [];
let postAuthorsCache = {};
let followersCount = 0;
let followingCount = 0;
let isFollowing = false;

// ===== Утилиты =====
function fmtDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const p = (x) => String(x).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()}`;
}
function fmtDateTime(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const p = (x) => String(x).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function timeAgo(ts) {
    if (!ts) return 'никогда';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'только что';
    if (min < 60) return min + ' мин назад';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + ' ч назад';
    const day = Math.floor(hr / 24);
    if (day < 30) return day + ' дн назад';
    return fmtDate(ts);
}
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
function profilePostScore(p) {
    const likes = (p.likes || []).length;
    const hasTag = hasHashtag(p.text) ? 1 : 0;
    const ts = p.ts?.seconds ? p.ts.seconds * 1000 : Date.now();
    const hoursOld = (Date.now() - ts) / (1000 * 60 * 60);
    const freshness = Math.max(0, 30 - hoursOld);
    const random = Math.random() * 15;
    return likes * 10 + hasTag * 5 + freshness + random;
}

// ===== Уровни =====
function expForLevel(level) { return level * 100; }
function totalExpForLevel(level) { return 100 * level * (level + 1) / 2; }
function computeLevel(exp) {
    let level = 1;
    while (exp >= totalExpForLevel(level)) level++;
    return level - 1 >= 1 ? level - 1 : 1;
}
function expInLevel(exp, level) { return exp - totalExpForLevel(level - 1); }
function expNeeded(level) { return expForLevel(level); }

// ===== Визит =====
async function registerVisit() {
    if (!isOwnProfile || !currentUser) return;
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) return;
        const d = snap.data();
        await updateDoc(userRef, {
            lastOnline: serverTimestamp(),
            loginCount: (d.loginCount || 0) + 1
        });
    } catch (e) { console.error('registerVisit:', e); }
}

// ===== Загрузка =====
async function loadProfile(uid) {
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (!snap.exists()) {
            document.getElementById('nick-big').textContent = 'Пользователь не найден';
            return;
        }
        viewedData = { uid, ...snap.data() };
        renderProfile();
    } catch (e) {
        console.error(e);
        document.getElementById('nick-big').textContent = 'Ошибка: ' + e.message;
    }
}

// ===== Рендер =====
function renderProfile() {
    const d = viewedData;
    const nick = d.nick || '???';
    const avatar = d.avatar;

    const avEl = document.getElementById('avatar-big');
    if (avatar) avEl.innerHTML = `<img src="${avatar}" alt="">`;
    else avEl.textContent = nick.charAt(0).toUpperCase();

    const nickEl = document.getElementById('nick-big');
    nickEl.textContent = nick;
    if (d.nickColor) nickEl.style.color = d.nickColor;

    document.getElementById('verified-badge').style.display = d.verified ? 'flex' : 'none';

    const unEl = document.getElementById('username-line');
    if (d.username) {
        unEl.textContent = '@' + d.username;
        unEl.style.display = 'inline-block';
        unEl.onclick = () => {
            navigator.clipboard.writeText('@' + d.username);
            const oldText = unEl.textContent;
            unEl.textContent = 'Скопировано';
            setTimeout(() => unEl.textContent = oldText, 1000);
        };
    } else {
        unEl.style.display = 'none';
    }

    const statusEl = document.getElementById('status-line');
    if (d.status) {
        statusEl.textContent = d.status;
        statusEl.style.color = d.statusColor || '#a0c4ff';
        statusEl.style.borderColor = (d.statusColor || '#a0c4ff') + '55';
        statusEl.style.display = 'inline-block';
    } else {
        statusEl.style.display = 'none';
    }

    document.getElementById('tag-line').textContent = '#' + shortTag(d.uid);

    const csEl = document.getElementById('custom-status');
    if (d.customStatus) {
        csEl.textContent = d.customStatus;
        csEl.style.display = 'block';
    } else {
        csEl.style.display = 'none';
    }

    document.getElementById('stat-registered').textContent = fmtDate(d.createdAt);
    document.getElementById('stat-online').textContent = timeAgo(d.lastOnline);
    document.getElementById('stat-visits').textContent = (d.loginCount || 0).toLocaleString('ru-RU');
    document.getElementById('stat-messages').textContent = (d.forumMsgCount || 0).toLocaleString('ru-RU');
    document.getElementById('stat-rep').textContent = (d.reputation || 0).toLocaleString('ru-RU');

    const exp = d.exp || 0;
    const level = computeLevel(exp);
    document.getElementById('stat-level').textContent = level;
    document.getElementById('lv-num').textContent = level;

    const curExp = expInLevel(exp, level);
    const needExp = expNeeded(level);
    const pct = Math.min(100, Math.round((curExp / needExp) * 100));
    document.getElementById('lv-exp').textContent = `${curExp} / ${needExp} XP`;
    document.getElementById('lv-fill').style.width = pct + '%';

    document.getElementById('info-bio').textContent = d.bio || '—';
    document.getElementById('info-location').textContent = d.location || '—';

    if (d.birthday) {
        const bd = new Date(d.birthday);
        const age = Math.floor((Date.now() - bd.getTime()) / (365.25 * 24 * 3600 * 1000));
        document.getElementById('info-birthday').textContent = `${fmtDate(bd)} (${age} лет)`;
    } else {
        document.getElementById('info-birthday').textContent = '—';
    }

    document.getElementById('info-games').textContent =
        (d.favoriteGames && d.favoriteGames.length) ? d.favoriteGames.join(', ') : '—';
    document.getElementById('info-movies').textContent =
        (d.favoriteMovies && d.favoriteMovies.length) ? d.favoriteMovies.join(', ') : '—';

    const links = [];
    if (d.linkSite) links.push(`<a href="${escapeHtml(d.linkSite)}" target="_blank">Сайт</a>`);
    if (d.linkDiscord) links.push(`Discord: ${escapeHtml(d.linkDiscord)}`);
    if (d.linkTelegram) {
        const tg = d.linkTelegram.startsWith('@') ? d.linkTelegram.slice(1) : d.linkTelegram;
        links.push(`<a href="https://t.me/${escapeHtml(tg)}" target="_blank">Telegram</a>`);
    }
    document.getElementById('info-links').innerHTML = links.length ? links.join(' · ') : '—';

    if (isOwnProfile) {
        document.getElementById('edit-btn').style.display = 'block';
        document.getElementById('write-btn').style.display = 'none';
        document.getElementById('follow-btn').style.display = 'none';
        document.getElementById('rep-up').style.display = 'none';
    } else {
        document.getElementById('edit-btn').style.display = 'none';
        document.getElementById('write-btn').style.display = 'block';
        document.getElementById('follow-btn').style.display = 'block';
        document.getElementById('rep-up').style.display = 'block';
    }

    document.getElementById('follows-row').style.display = 'flex';

    document.title = nick + ' — HyoJoy';
}

// ===== Написать =====
document.getElementById('write-btn').addEventListener('click', () => {
    if (isOwnProfile || !currentUser || !viewedUid) return;
    window.location.href = 'forum.html?dm=' + viewedUid;
});

// ===== Репутация =====
document.getElementById('rep-up').addEventListener('click', async () => {
    if (isOwnProfile || !currentUser || !viewedUid) return;
    const btn = document.getElementById('rep-up');
    btn.disabled = true;
    try {
        const q = query(
            collection(db, 'reputation'),
            where('fromUid', '==', currentUser.uid),
            where('toUid', '==', viewedUid),
            limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            alert('Ты уже ставил репутацию этому юзеру');
            btn.disabled = false;
            return;
        }
        await addDoc(collection(db, 'reputation'), {
            fromUid: currentUser.uid,
            toUid: viewedUid,
            value: 1,
            ts: serverTimestamp()
        });
        await recalcReputation(viewedUid);
        alert('Спасибо за оценку!');
    } catch (e) {
        console.error(e);
        alert('Ошибка: ' + e.message);
    }
    btn.disabled = false;
});

async function recalcReputation(uid) {
    try {
        const snap = await getDocs(query(collection(db, 'reputation'), where('toUid', '==', uid)));
        let total = 0;
        snap.forEach((d) => total += Number(d.data().value || 0));
        document.getElementById('stat-rep').textContent = total.toLocaleString('ru-RU');
        return total;
    } catch (e) { return 0; }
}

// ============================================================
// ПОДПИСКИ
// ============================================================
async function loadFollows() {
    if (!viewedUid) return;
    try {
        const followersSnap = await getDocs(
            query(collection(db, 'follows'), where('followingUid', '==', viewedUid))
        );
        followersCount = followersSnap.size;
        document.getElementById('followers-count').textContent = followersCount;

        const followingSnap = await getDocs(
            query(collection(db, 'follows'), where('followerUid', '==', viewedUid))
        );
        followingCount = followingSnap.size;
        document.getElementById('following-count').textContent = followingCount;

        if (currentUser && !isOwnProfile) {
            const mySnap = await getDocs(
                query(
                    collection(db, 'follows'),
                    where('followerUid', '==', currentUser.uid),
                    where('followingUid', '==', viewedUid),
                    limit(1)
                )
            );
            isFollowing = !mySnap.empty;
            updateFollowBtn();
        }
    } catch (e) {
        console.error('loadFollows:', e);
    }
}

function updateFollowBtn() {
    const btn = document.getElementById('follow-btn');
    if (!btn) return;
    if (isFollowing) {
        btn.textContent = 'Отписаться';
        btn.classList.add('following');
    } else {
        btn.textContent = 'Подписаться';
        btn.classList.remove('following');
    }
}

document.getElementById('follow-btn').addEventListener('click', async () => {
    if (!currentUser || isOwnProfile || !viewedUid) return;
    const btn = document.getElementById('follow-btn');
    btn.disabled = true;

    try {
        if (isFollowing) {
            const q = query(
                collection(db, 'follows'),
                where('followerUid', '==', currentUser.uid),
                where('followingUid', '==', viewedUid)
            );
            const snap = await getDocs(q);
            for (const d of snap.docs) {
                await deleteDoc(doc(db, 'follows', d.id));
            }
            isFollowing = false;
        } else {
            await addDoc(collection(db, 'follows'), {
                followerUid: currentUser.uid,
                followerNick: currentUser.displayName || currentUser.email.split('@')[0],
                followingUid: viewedUid,
                ts: serverTimestamp()
            });
            isFollowing = true;
        }
        updateFollowBtn();
        await loadFollows();
    } catch (e) {
        console.error(e);
        alert('Ошибка: ' + e.message);
    }
    btn.disabled = false;
});

// ============================================================
// ПОСТЫ
// ============================================================
async function subscribePosts() {
    if (!viewedUid) return;
    const box = document.getElementById('posts-list');

    if (isOwnProfile) {
        document.getElementById('post-form').style.display = 'block';
    } else {
        document.getElementById('post-form').style.display = 'none';
    }

    try {
        const q = query(
            collection(db, 'posts'),
            where('wallUid', '==', viewedUid),
            orderBy('ts', 'desc'),
            limit(100)
        );
        const snap = await getDocs(q);
        postsCache = [];
        snap.forEach((d) => postsCache.push({ id: d.id, ...d.data() }));
        await loadPostAuthors();
        renderPosts();
    } catch (e) {
        console.warn('posts index missing, fallback:', e.message);
        try {
            const snap2 = await getDocs(
                query(collection(db, 'posts'), where('wallUid', '==', viewedUid))
            );
            postsCache = [];
            snap2.forEach((d) => postsCache.push({ id: d.id, ...d.data() }));
            postsCache.sort((a, b) => (b.ts?.seconds || 0) - (a.ts?.seconds || 0));
            await loadPostAuthors();
            renderPosts();
        } catch (e2) {
            box.innerHTML = '<div class="empty">Ошибка: ' + e2.message + '</div>';
        }
    }
}

async function loadPostAuthors() {
    const uids = new Set();
    postsCache.forEach((p) => uids.add(p.authorUid));
    try {
        for (const uid of uids) {
            if (postAuthorsCache[uid]) continue;
            const snap = await getDoc(doc(db, 'users', uid));
            if (snap.exists()) postAuthorsCache[uid] = { uid, ...snap.data() };
        }
    } catch (e) { console.error(e); }
}

function renderPosts() {
    const box = document.getElementById('posts-list');
    const countEl = document.getElementById('posts-count');
    countEl.textContent = postsCache.length;

    if (!postsCache.length) {
        box.innerHTML = '<div class="empty">Постов пока нет</div>';
        return;
    }

    // Умная сортировка
    postsCache = postsCache.slice().sort((a, b) => profilePostScore(b) - profilePostScore(a));

    box.innerHTML = postsCache.map((p) => {
        const author = postAuthorsCache[p.authorUid] || { nick: p.authorNick || '???', avatar: null };
        const nick = author.nick || '???';
        const avatar = author.avatar;
        const avatarInner = avatar
            ? `<img src="${avatar}" alt="">`
            : escapeHtml(nick.charAt(0).toUpperCase());
        const nickColor = author.nickColor || '';
        const likes = p.likes || [];
        const liked = currentUser && likes.includes(currentUser.uid);
        const canDelete = currentUser && (p.authorUid === currentUser.uid || viewedUid === currentUser.uid);

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
                    <div class="post-text">${linkifyHashtags(p.text)}</div>
                    <div class="post-actions">
                        <button class="post-like ${liked ? 'liked' : ''}" data-like-id="${p.id}">
                            ${liked ? '❤' : '♡'} <span>${likes.length}</span>
                        </button>
                        ${canDelete ? `<button class="post-delete" data-delete-id="${p.id}">Удалить</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    box.querySelectorAll('.profile-link').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const uid = el.dataset.uid;
            if (uid === currentUser.uid) window.location.href = 'profile.html';
            else window.location.href = 'profile.html?id=' + uid;
        });
    });

    box.querySelectorAll('[data-like-id]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await togglePostLike(btn.dataset.likeId);
        });
    });

    box.querySelectorAll('.post-delete').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm('Удалить пост?')) return;
            try {
                await deleteDoc(doc(db, 'posts', btn.dataset.deleteId));
                subscribePosts();
            } catch (e) { alert('Ошибка: ' + e.message); }
        });
    });

    box.querySelectorAll('.hashtag').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = 'hashtag.html?tag=' + encodeURIComponent(el.dataset.tag);
        });
    });
}

async function togglePostLike(postId) {
    if (!currentUser) return;
    const post = postsCache.find((p) => p.id === postId);
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
        await subscribePosts();
    } catch (e) { alert('Ошибка: ' + e.message); }
}

document.getElementById('post-send').addEventListener('click', async () => {
    if (!currentUser || !isOwnProfile) return;
    const input = document.getElementById('post-input');
    const text = input.value.trim();
    if (!text) return;

    const btn = document.getElementById('post-send');
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
        await subscribePosts();
        try {
            const usnap = await getDoc(doc(db, 'users', currentUser.uid));
            const curExp = usnap.exists() ? (usnap.data().exp || 0) : 0;
            await updateDoc(doc(db, 'users', currentUser.uid), { exp: curExp + 3 });
        } catch (e) {}
    } catch (e) {
        console.error(e);
        const msg = document.getElementById('post-msg');
        msg.className = 'message error';
        msg.textContent = 'Ошибка: ' + e.message;
        setTimeout(() => msg.className = 'message', 3000);
    }
    btn.disabled = false;
});

// ============================================================
// КОММЕНТАРИИ
// ============================================================
async function subscribeComments() {
    if (!viewedUid) return;
    const box = document.getElementById('comments-list');
    try {
        const q = query(
            collection(db, 'profile_comments'),
            where('toUid', '==', viewedUid),
            orderBy('ts', 'desc'),
            limit(100)
        );
        const snap = await getDocs(q);
        commentsCache = [];
        snap.forEach((d) => commentsCache.push({ id: d.id, ...d.data() }));
        await loadCommentAuthors();
        renderComments();
    } catch (e) {
        try {
            const snap2 = await getDocs(
                query(collection(db, 'profile_comments'), where('toUid', '==', viewedUid))
            );
            commentsCache = [];
            snap2.forEach((d) => commentsCache.push({ id: d.id, ...d.data() }));
            commentsCache.sort((a, b) => (b.ts?.seconds || 0) - (a.ts?.seconds || 0));
            await loadCommentAuthors();
            renderComments();
        } catch (e2) {
            box.innerHTML = '<div class="empty">Ошибка: ' + e2.message + '</div>';
        }
    }
}

async function loadCommentAuthors() {
    const uids = new Set();
    commentsCache.forEach((c) => uids.add(c.fromUid));
    try {
        for (const uid of uids) {
            if (usersCacheForComments[uid]) continue;
            const snap = await getDoc(doc(db, 'users', uid));
            if (snap.exists()) usersCacheForComments[uid] = { uid, ...snap.data() };
        }
    } catch (e) { console.error(e); }
}

function renderComments() {
    const box = document.getElementById('comments-list');
    const countEl = document.getElementById('comments-count');
    countEl.textContent = commentsCache.length;

    if (!commentsCache.length) {
        box.innerHTML = '<div class="empty">Комментариев пока нет</div>';
        return;
    }

    box.innerHTML = commentsCache.map((c) => {
        const author = usersCacheForComments[c.fromUid] || { nick: c.fromNick || '???', avatar: null };
        const nick = author.nick || '???';
        const avatar = author.avatar;
        const avatarInner = avatar
            ? `<img src="${avatar}" alt="">`
            : escapeHtml(nick.charAt(0).toUpperCase());
        const nickColor = author.nickColor || '';
        const canDelete = currentUser && (c.fromUid === currentUser.uid || viewedUid === currentUser.uid);

        return `
            <div class="comment-item" data-comment-id="${c.id}">
                <div class="comment-avatar profile-link" data-uid="${c.fromUid}">${avatarInner}</div>
                <div class="comment-body">
                    <div class="comment-head">
                        <span class="comment-nick profile-link" data-uid="${c.fromUid}" style="${nickColor ? 'color:' + nickColor : ''}">
                            ${escapeHtml(nick)}
                        </span>
                        <span class="comment-tag">#${shortTag(c.fromUid)}</span>
                        <span class="comment-date">${fmtDateTime(c.ts)}</span>
                    </div>
                    <div class="comment-text">${linkifyHashtags(c.text)}</div>
                    ${canDelete ? `<button class="comment-delete" data-delete-id="${c.id}">Удалить</button>` : ''}
                </div>
            </div>
        `;
    }).join('');

    box.querySelectorAll('.profile-link').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const uid = el.dataset.uid;
            if (uid === currentUser.uid) window.location.href = 'profile.html';
            else window.location.href = 'profile.html?id=' + uid;
        });
    });

    box.querySelectorAll('.comment-delete').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm('Удалить комментарий?')) return;
            try {
                await deleteDoc(doc(db, 'profile_comments', btn.dataset.deleteId));
                subscribeComments();
            } catch (e) { alert('Ошибка: ' + e.message); }
        });
    });

    box.querySelectorAll('.hashtag').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = 'hashtag.html?tag=' + encodeURIComponent(el.dataset.tag);
        });
    });
}

document.getElementById('comment-send').addEventListener('click', async () => {
    if (!currentUser || !viewedUid) return;
    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if (!text) return;
    const btn = document.getElementById('comment-send');
    btn.disabled = true;
    try {
        await addDoc(collection(db, 'profile_comments'), {
            toUid: viewedUid,
            fromUid: currentUser.uid,
            fromNick: currentUser.displayName || currentUser.email.split('@')[0],
            text,
            ts: serverTimestamp()
        });
        input.value = '';
        await subscribeComments();
    } catch (e) {
        const msg = document.getElementById('comment-msg');
        msg.className = 'message error';
        msg.textContent = 'Ошибка: ' + e.message;
        setTimeout(() => msg.className = 'message', 3000);
    }
    btn.disabled = false;
});

// ===== Модалка =====
document.getElementById('edit-btn').addEventListener('click', () => {
    if (!isOwnProfile || !viewedData) return;
    const d = viewedData;
    document.getElementById('edit-custom-status').value = d.customStatus || '';
    document.getElementById('edit-bio').value = d.bio || '';
    document.getElementById('edit-location').value = d.location || '';
    document.getElementById('edit-birthday').value = d.birthday || '';
    document.getElementById('edit-games').value = (d.favoriteGames || []).join(', ');
    document.getElementById('edit-movies').value = (d.favoriteMovies || []).join(', ');
    document.getElementById('edit-site').value = d.linkSite || '';
    document.getElementById('edit-discord').value = d.linkDiscord || '';
    document.getElementById('edit-telegram').value = d.linkTelegram || '';
    document.getElementById('edit-msg').className = 'message';
    document.getElementById('edit-modal').classList.add('open');
});
document.getElementById('edit-close').addEventListener('click', () => {
    document.getElementById('edit-modal').classList.remove('open');
});
document.getElementById('edit-modal').addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') {
        document.getElementById('edit-modal').classList.remove('open');
    }
});

document.getElementById('edit-save').addEventListener('click', async () => {
    if (!isOwnProfile) return;
    const msg = document.getElementById('edit-msg');
    const btn = document.getElementById('edit-save');
    btn.disabled = true;
    try {
        const parseList = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
        await updateDoc(doc(db, 'users', currentUser.uid), {
            customStatus: document.getElementById('edit-custom-status').value.trim(),
            bio: document.getElementById('edit-bio').value.trim(),
            location: document.getElementById('edit-location').value.trim(),
            birthday: document.getElementById('edit-birthday').value,
            favoriteGames: parseList(document.getElementById('edit-games').value),
            favoriteMovies: parseList(document.getElementById('edit-movies').value),
            linkSite: document.getElementById('edit-site').value.trim(),
            linkDiscord: document.getElementById('edit-discord').value.trim(),
            linkTelegram: document.getElementById('edit-telegram').value.trim()
        });
        msg.className = 'message success';
        msg.textContent = 'Сохранено';
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        viewedData = { uid: currentUser.uid, ...snap.data() };
        renderProfile();
        setTimeout(() => document.getElementById('edit-modal').classList.remove('open'), 600);
    } catch (e) {
        msg.className = 'message error';
        msg.textContent = 'Ошибка: ' + e.message;
    }
    btn.disabled = false;
});

// ===== Init =====
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    currentUser = user;

    const params = new URLSearchParams(window.location.search);
    viewedUid = params.get('id') || user.uid;
    isOwnProfile = viewedUid === user.uid;

    if (isOwnProfile) await registerVisit();

    await loadProfile(viewedUid);

    if (viewedData) await recalcReputation(viewedUid);

    const commSnap = await getDocs(
        query(collection(db, 'profile_comments'), where('toUid', '==', viewedUid))
    );
    document.getElementById('stat-comments-received').textContent = commSnap.size;

    await loadFollows();
    await subscribePosts();
    await subscribeComments();
});