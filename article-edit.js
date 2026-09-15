import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, doc, getDoc, addDoc, updateDoc, collection,
    getDocs, query, orderBy, limit, serverTimestamp
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
let editingId = null;
let existingArticle = null;

function showMsg(text, type) {
    const el = document.getElementById('msg');
    el.textContent = text;
    el.className = 'message ' + type;
}

// Загружаем существующие папки для подсказки
async function loadFolders() {
    try {
        const q = query(collection(db, 'articles'), orderBy('ts', 'desc'), limit(200));
        const snap = await getDocs(q);
        const set = new Set();
        snap.forEach((d) => {
            const f = d.data().folder;
            if (f) set.add(f);
        });
        const dl = document.getElementById('folders-list');
        dl.innerHTML = Array.from(set).sort().map((f) => `<option value="${f}">`).join('');
    } catch (e) {
        console.error(e);
    }
}

// Загрузка статьи для редактирования
async function loadExisting() {
    if (!editingId) return;
    try {
        const snap = await getDoc(doc(db, 'articles', editingId));
        if (!snap.exists()) {
            showMsg('Статья не найдена', 'error');
            return;
        }
        existingArticle = { id: editingId, ...snap.data() };
        if (existingArticle.authorUid !== currentUser.uid) {
            showMsg('Это не ваша статья', 'error');
            document.getElementById('save-btn').disabled = true;
            return;
        }
        document.getElementById('title').value = existingArticle.title || '';
        document.getElementById('folder').value = existingArticle.folder || '';
        document.getElementById('content').value = existingArticle.content || '';
        document.getElementById('editor-title').textContent = 'Редактирование статьи';
        document.title = 'Редактирование — HyoJoy';
    } catch (e) {
        console.error(e);
        showMsg('Ошибка: ' + e.message, 'error');
    }
}

async function saveArticle() {
    const title = document.getElementById('title').value.trim();
    const folder = document.getElementById('folder').value.trim() || 'Без папки';
    const content = document.getElementById('content').value.trim();

    if (!title) return showMsg('Введите заголовок', 'error');
    if (!content) return showMsg('Введите содержимое', 'error');

    const btn = document.getElementById('save-btn');
    btn.disabled = true;

    try {
        if (editingId) {
            await updateDoc(doc(db, 'articles', editingId), {
                title, folder, content
            });
            showMsg('Сохранено', 'success');
            setTimeout(() => {
                window.location.href = 'article.html?id=' + editingId;
            }, 600);
        } else {
            const docRef = await addDoc(collection(db, 'articles'), {
                title,
                folder,
                content,
                authorUid: currentUser.uid,
                authorNick: currentUser.displayName || currentUser.email.split('@')[0],
                authorTag: currentUser.uid.slice(0, 8),
                ts: serverTimestamp()
            });
            showMsg('Опубликовано', 'success');
            setTimeout(() => {
                window.location.href = 'article.html?id=' + docRef.id;
            }, 600);
        }
    } catch (e) {
        console.error(e);
        showMsg('Ошибка: ' + e.message, 'error');
        btn.disabled = false;
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    currentUser = user;

    const params = new URLSearchParams(window.location.search);
    editingId = params.get('id') || null;

    const folderPreset = params.get('folder');
    if (folderPreset && !editingId) {
        document.getElementById('folder').value = folderPreset;
    }

    await loadFolders();
    if (editingId) await loadExisting();

    document.getElementById('save-btn').addEventListener('click', saveArticle);

    // Ctrl+S
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveArticle();
        }
    });
});