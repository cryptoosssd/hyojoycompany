import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
let currentArticle = null;

// ===== Простой markdown-подобный парсер =====
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderMarkdown(text) {
    // Разбиваем на строки
    const lines = String(text || '').split('\n');
    const out = [];
    let inCode = false;
    let codeBuf = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Код ```...```
        if (line.trim().startsWith('```')) {
            if (inCode) {
                out.push('<pre><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>');
                codeBuf = [];
                inCode = false;
            } else {
                inCode = true;
            }
            continue;
        }
        if (inCode) {
            codeBuf.push(line);
            continue;
        }

        // Заголовки
        if (line.startsWith('### ')) {
            out.push('<h3>' + inline(line.slice(4)) + '</h3>');
            continue;
        }
        if (line.startsWith('## ')) {
            out.push('<h2>' + inline(line.slice(3)) + '</h2>');
            continue;
        }
        if (line.startsWith('# ')) {
            out.push('<h2>' + inline(line.slice(2)) + '</h2>');
            continue;
        }

        // Цитата
        if (line.startsWith('> ')) {
            out.push('<blockquote>' + inline(line.slice(2)) + '</blockquote>');
            continue;
        }

        // Разделитель
        if (line.trim() === '---' || line.trim() === '***') {
            out.push('<hr>');
            continue;
        }

        // Списки
        if (/^[-*] /.test(line)) {
            const items = [];
            while (i < lines.length && /^[-*] /.test(lines[i])) {
                items.push('<li>' + inline(lines[i].slice(2)) + '</li>');
                i++;
            }
            i--;
            out.push('<ul>' + items.join('') + '</ul>');
            continue;
        }
        if (/^\d+\. /.test(line)) {
            const items = [];
            while (i < lines.length && /^\d+\. /.test(lines[i])) {
                items.push('<li>' + inline(lines[i].replace(/^\d+\.\s+/, '')) + '</li>');
                i++;
            }
            i--;
            out.push('<ol>' + items.join('') + '</ol>');
            continue;
        }

        // Пустая строка — разделитель абзацев
        if (line.trim() === '') {
            out.push('');
            continue;
        }

        // Обычный абзац
        out.push('<p>' + inline(line) + '</p>');
    }

    return out.join('\n');
}

// Инлайн-разметка: **bold**, *italic*, `code`, [link](url)
function inline(s) {
    let t = escapeHtml(s);
    // code
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    // bold
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // italic
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // links
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return t;
}

// ===== Загрузка статьи =====
function fmtDate(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const p = (x) => String(x).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

async function loadArticle() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        document.getElementById('not-found').style.display = 'block';
        document.querySelector('.article').style.display = 'none';
        return;
    }

    try {
        const snap = await getDoc(doc(db, 'articles', id));
        if (!snap.exists()) {
            document.getElementById('not-found').style.display = 'block';
            document.querySelector('.article').style.display = 'none';
            return;
        }
        currentArticle = { id, ...snap.data() };

        document.getElementById('article-folder').textContent =
            '📁 ' + (currentArticle.folder || 'Без папки');
        document.getElementById('article-title').textContent =
            currentArticle.title || 'Без названия';
        document.getElementById('article-meta').innerHTML =
            `<span class="author">${escapeHtml(currentArticle.authorNick || '???')}</span>
             <span class="tag">#${escapeHtml(currentArticle.authorTag || '')}</span>
             <span>${fmtDate(currentArticle.ts)}</span>`;
        document.getElementById('article-content').innerHTML =
            renderMarkdown(currentArticle.content || '');

        document.title = (currentArticle.title || 'Статья') + ' — HyoJoy';

        // Кнопка "Редактировать" — если это твоя статья
        if (currentArticle.authorUid === currentUser.uid) {
            document.getElementById('edit-btn').style.display = 'inline-block';
            document.getElementById('delete-btn').style.display = 'inline-block';

            document.getElementById('edit-btn').addEventListener('click', () => {
                window.location.href = 'article-edit.html?id=' + currentArticle.id;
            });

            document.getElementById('delete-btn').addEventListener('click', async () => {
                if (!confirm('Удалить статью?')) return;
                try {
                    await deleteDoc(doc(db, 'articles', currentArticle.id));
                    window.location.href = 'forum.html';
                } catch (e) {
                    alert('Ошибка: ' + e.message);
                }
            });
        }
    } catch (e) {
        console.error(e);
        document.getElementById('not-found').textContent = 'Ошибка: ' + e.message;
        document.getElementById('not-found').style.display = 'block';
        document.querySelector('.article').style.display = 'none';
    }
}

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    currentUser = user;
    loadArticle();
});