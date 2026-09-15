// ===== Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, collection, getDocs, doc, getDoc, updateDoc, deleteDoc,
    addDoc, setDoc, serverTimestamp, query, orderBy
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

// ============================================================
// ПАРОЛЬ АДМИНКИ
// ============================================================
const ADMIN_PASSWORD = 'hyojoy2026admin';
// ============================================================

let currentUser = null;

// ===== Утилиты =====
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function shortTag(uid) { return uid.slice(0, 8); }
function fmtMoney(n) {
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function verifiedSvg() {
    return `<svg viewBox="0 0 24 24" fill="#a0c4ff" xmlns="http://www.w3.org/2000/svg" style="width:14px;height:14px;vertical-align:-2px;">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
    </svg>`;
}

// ===== Логин =====
document.getElementById('login-btn').addEventListener('click', tryLogin);
document.getElementById('admin-pass').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryLogin();
});

function tryLogin() {
    const pass = document.getElementById('admin-pass').value;
    const msg = document.getElementById('login-msg');
    if (pass === ADMIN_PASSWORD) {
        msg.className = 'message success';
        msg.textContent = 'Вход выполнен';
        setTimeout(() => {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'block';
            document.getElementById('pass-shown').textContent = ADMIN_PASSWORD;
            loadUsers();
            loadProducts();
            loadFiles();
            loadCompany();
            loadDividends();
            loadBonds();
            loadApiKey();
        }, 400);
    } else {
        msg.className = 'message error';
        msg.textContent = 'Неверный пароль';
    }
}

document.getElementById('logout-admin').addEventListener('click', () => {
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-pass').value = '';
    document.getElementById('login-msg').className = 'message';
});

// ===== Табы =====
document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    });
});

// ============================================================
// АККАУНТЫ
// ============================================================
let allUsers = [];
let editingUid = null;

async function loadUsers() {
    const list = document.getElementById('users-list');
    list.innerHTML = '<div class="empty">Загрузка...</div>';
    try {
        const snap = await getDocs(collection(db, 'users'));
        allUsers = [];
        snap.forEach((d) => allUsers.push({ uid: d.id, ...d.data() }));
        allUsers.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        renderUsers(allUsers);
    } catch (e) {
        list.innerHTML = '<div class="empty">Ошибка: ' + e.message + '</div>';
        console.error(e);
    }
}

function renderUsers(list) {
    const box = document.getElementById('users-list');
    if (!list.length) {
        box.innerHTML = '<div class="empty">Пользователей нет</div>';
        return;
    }
    box.innerHTML = list.map((u) => {
        const nick = u.nick || '???';
        const avatarUrl = u.avatar;
        const avatarInner = avatarUrl
            ? `<img src="${avatarUrl}" alt="">`
            : escapeHtml(nick.charAt(0).toUpperCase());
        const status = u.status || '';
        const statusColor = u.statusColor || '#a0c4ff';
        const nickColor = u.nickColor || '';
        const verified = u.verified ? `<span class="verified-icon">${verifiedSvg()}</span>` : '';
        const isAdmin = u.isAdmin ? '<span class="row-badge admin">admin</span>' : '<span class="row-badge regular">user</span>';
        const balance = Number(u.balanceUSD || 0);
        const shares = Number(u.sharesHYOJ || 0);

        return `
            <div class="user-row" data-uid="${u.uid}">
                <div class="row-avatar">${avatarInner}</div>
                <div class="row-info">
                    <div class="row-nick" style="${nickColor ? 'color:' + nickColor : ''}">
                        ${escapeHtml(nick)} ${verified}
                    </div>
                    ${status ? `<div class="row-status" style="color:${statusColor}">${escapeHtml(status)}</div>` : ''}
                    <div class="row-tag">#${shortTag(u.uid)}</div>
                </div>
                ${isAdmin}
                <div>
                    <div class="row-balance">${fmtMoney(balance)}</div>
                    <div class="row-shares">${shares} акций</div>
                </div>
                <div style="color:var(--text-muted);font-size:20px;">›</div>
            </div>
        `;
    }).join('');

    box.querySelectorAll('.user-row').forEach((el) => {
        el.addEventListener('click', () => openEdit(el.dataset.uid));
    });
}

document.getElementById('search').addEventListener('input', (e) => {
    const s = e.target.value.trim().toLowerCase();
    if (!s) return renderUsers(allUsers);
    const q = s.replace('#', '');
    const filtered = allUsers.filter((u) =>
        (u.nick || '').toLowerCase().includes(s) ||
        u.uid.toLowerCase().includes(q)
    );
    renderUsers(filtered);
});

function openEdit(uid) {
    const u = allUsers.find((x) => x.uid === uid);
    if (!u) return;
    editingUid = uid;

    const nick = u.nick || '???';
    const avatarUrl = u.avatar;
    const avatarEl = document.getElementById('edit-avatar');
    if (avatarUrl) {
        avatarEl.innerHTML = `<img src="${avatarUrl}" alt="">`;
    } else {
        avatarEl.innerHTML = escapeHtml(nick.charAt(0).toUpperCase());
    }

    document.getElementById('edit-nick').textContent = nick;
    document.getElementById('edit-tag').textContent = '#' + shortTag(uid);
    document.getElementById('edit-status').value = u.status || '';
    document.getElementById('edit-status-color').value = u.statusColor || '#a0c4ff';
    document.getElementById('edit-status-color-val').textContent = u.statusColor || '#a0c4ff';
    document.getElementById('edit-nick-color').value = u.nickColor || '#ffffff';
    document.getElementById('edit-nick-color-val').textContent = u.nickColor || '#ffffff';
    document.getElementById('edit-verified').checked = !!u.verified;
    document.getElementById('edit-admin').checked = !!u.isAdmin;
    document.getElementById('edit-balance').value = Number(u.balanceUSD || 0);
    document.getElementById('edit-shares').value = Number(u.sharesHYOJ || 0);
    document.getElementById('edit-msg').className = 'message';

    document.getElementById('edit-modal').classList.add('open');
}

document.getElementById('edit-close').addEventListener('click', closeEdit);
document.getElementById('edit-modal').addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') closeEdit();
});
function closeEdit() {
    document.getElementById('edit-modal').classList.remove('open');
    editingUid = null;
}

document.getElementById('edit-status-color').addEventListener('input', (e) => {
    document.getElementById('edit-status-color-val').textContent = e.target.value;
});
document.getElementById('edit-nick-color').addEventListener('input', (e) => {
    document.getElementById('edit-nick-color-val').textContent = e.target.value;
});

document.getElementById('edit-save').addEventListener('click', async () => {
    if (!editingUid) return;
    const msg = document.getElementById('edit-msg');
    const btn = document.getElementById('edit-save');
    btn.disabled = true;

    try {
        await updateDoc(doc(db, 'users', editingUid), {
            status: document.getElementById('edit-status').value.trim(),
            statusColor: document.getElementById('edit-status-color').value,
            nickColor: document.getElementById('edit-nick-color').value,
            verified: document.getElementById('edit-verified').checked,
            isAdmin: document.getElementById('edit-admin').checked,
            balanceUSD: Number(document.getElementById('edit-balance').value) || 0,
            sharesHYOJ: Number(document.getElementById('edit-shares').value) || 0
        });
        msg.className = 'message success';
        msg.textContent = 'Сохранено';
        await loadUsers();
        setTimeout(closeEdit, 800);
    } catch (e) {
        console.error(e);
        msg.className = 'message error';
        msg.textContent = 'Ошибка: ' + e.message;
    }
    btn.disabled = false;
});

document.getElementById('edit-delete').addEventListener('click', async () => {
    if (!editingUid) return;
    if (!confirm('Удалить аккаунт навсегда?')) return;
    const msg = document.getElementById('edit-msg');
    try {
        await deleteDoc(doc(db, 'users', editingUid));
        msg.className = 'message success';
        msg.textContent = 'Аккаунт удалён';
        await loadUsers();
        setTimeout(closeEdit, 800);
    } catch (e) {
        console.error(e);
        msg.className = 'message error';
        msg.textContent = 'Ошибка: ' + e.message;
    }
});

// ============================================================
// ТОВАРЫ
// ============================================================
let allProducts = [];
let editingProductId = null;
let pendingProductImage = null;

async function loadProducts() {
    const list = document.getElementById('products-list');
    list.innerHTML = '<div class="empty">Загрузка...</div>';
    try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        allProducts = [];
        snap.forEach((d) => allProducts.push({ id: d.id, ...d.data() }));
        renderProducts(allProducts);
    } catch (e) {
        try {
            const snap = await getDocs(collection(db, 'products'));
            allProducts = [];
            snap.forEach((d) => allProducts.push({ id: d.id, ...d.data() }));
            allProducts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            renderProducts(allProducts);
        } catch (e2) {
            list.innerHTML = '<div class="empty">Ошибка: ' + e2.message + '</div>';
            console.error(e2);
        }
    }
}

function renderProducts(list) {
    const box = document.getElementById('products-list');
    if (!list.length) {
        box.innerHTML = '<div class="empty">Товаров нет. Нажми «+ Добавить товар»</div>';
        return;
    }
    box.innerHTML = list.map((p) => {
        const img = p.image ? `<img src="${p.image}" alt="">` : '';
        const price = Number(p.price || 0);
        const stock = Number(p.stock || 0);
        const created = p.createdAt && p.createdAt.toDate
            ? p.createdAt.toDate().toLocaleDateString('ru-RU') : '';
        return `
            <div class="product-card" data-id="${p.id}">
                <div class="product-img ${p.image ? '' : 'no-img'}">${p.image ? img : 'НЕТ ФОТО'}</div>
                <div class="product-info">
                    <div class="product-name">${escapeHtml(p.title || 'Без названия')}</div>
                    <div class="product-price">${fmtMoney(price)}</div>
                    <div class="product-meta">${stock} в наличии · ${created}</div>
                </div>
            </div>
        `;
    }).join('');

    box.querySelectorAll('.product-card').forEach((el) => {
        el.addEventListener('click', () => openProduct(el.dataset.id));
    });
}

document.getElementById('new-product-btn').addEventListener('click', () => {
    editingProductId = null;
    pendingProductImage = null;
    document.getElementById('product-modal-title').textContent = 'Новый товар';
    document.getElementById('product-title').value = '';
    document.getElementById('product-short').value = '';
    document.getElementById('product-desc').value = '';
    document.getElementById('product-price').value = '1';
    document.getElementById('product-stock').value = '100';
    document.getElementById('product-image-preview').innerHTML = '?';
    document.getElementById('product-msg').className = 'message';
    document.getElementById('product-delete').style.display = 'none';
    document.getElementById('product-modal').classList.add('open');
});

function openProduct(id) {
    const p = allProducts.find((x) => x.id === id);
    if (!p) return;
    editingProductId = id;
    pendingProductImage = null;

    document.getElementById('product-modal-title').textContent = 'Редактирование товара';
    document.getElementById('product-title').value = p.title || '';
    document.getElementById('product-short').value = p.short || '';
    document.getElementById('product-desc').value = p.description || '';
    document.getElementById('product-price').value = Number(p.price || 0);
    document.getElementById('product-stock').value = Number(p.stock || 0);

    const preview = document.getElementById('product-image-preview');
    if (p.image) preview.innerHTML = `<img src="${p.image}" alt="">`;
    else preview.innerHTML = '?';

    document.getElementById('product-msg').className = 'message';
    document.getElementById('product-delete').style.display = 'block';
    document.getElementById('product-modal').classList.add('open');
}

document.getElementById('product-close').addEventListener('click', closeProduct);
document.getElementById('product-modal').addEventListener('click', (e) => {
    if (e.target.id === 'product-modal') closeProduct();
});
function closeProduct() {
    document.getElementById('product-modal').classList.remove('open');
    editingProductId = null;
    pendingProductImage = null;
}

document.getElementById('product-pick-image').addEventListener('click', () => {
    document.getElementById('product-image-input').click();
});

document.getElementById('product-image-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const dataUrl = await processImage(file, 400);
        pendingProductImage = dataUrl;
        document.getElementById('product-image-preview').innerHTML = `<img src="${dataUrl}" alt="">`;
    } catch (err) {
        const msg = document.getElementById('product-msg');
        msg.className = 'message error';
        msg.textContent = err.message;
    }
    e.target.value = '';
});

function processImage(file, size = 400) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const ratio = img.width / img.height;
                let nw, nh;
                if (ratio > 1) { nw = size; nh = Math.round(size / ratio); }
                else { nh = size; nw = Math.round(size * ratio); }
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#1f1f1f';
                ctx.fillRect(0, 0, size, size);
                const dx = Math.round((size - nw) / 2);
                const dy = Math.round((size - nh) / 2);
                ctx.drawImage(img, dx, dy, nw, nh);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Ошибка чтения файла'));
        reader.readAsDataURL(file);
    });
}

document.getElementById('product-save').addEventListener('click', async () => {
    const msg = document.getElementById('product-msg');
    const btn = document.getElementById('product-save');

    const title = document.getElementById('product-title').value.trim();
    const short = document.getElementById('product-short').value.trim();
    const description = document.getElementById('product-desc').value.trim();
    const price = Number(document.getElementById('product-price').value) || 0;
    const stock = Number(document.getElementById('product-stock').value) || 0;

    if (!title) { msg.className = 'message error'; msg.textContent = 'Введите название'; return; }
    if (price <= 0) { msg.className = 'message error'; msg.textContent = 'Цена должна быть больше нуля'; return; }

    btn.disabled = true;
    try {
        if (editingProductId) {
            const update = { title, short, description, price, stock };
            if (pendingProductImage) update.image = pendingProductImage;
            await updateDoc(doc(db, 'products', editingProductId), update);
            msg.className = 'message success';
            msg.textContent = 'Сохранено';
        } else {
            if (!pendingProductImage) {
                msg.className = 'message error';
                msg.textContent = 'Загрузите изображение';
                btn.disabled = false;
                return;
            }
            await addDoc(collection(db, 'products'), {
                title, short, description, price, stock,
                image: pendingProductImage,
                createdAt: serverTimestamp()
            });
            msg.className = 'message success';
            msg.textContent = 'Товар добавлен';
        }
        await loadProducts();
        setTimeout(closeProduct, 800);
    } catch (e) {
        console.error(e);
        msg.className = 'message error';
        msg.textContent = 'Ошибка: ' + e.message;
    }
    btn.disabled = false;
});

document.getElementById('product-delete').addEventListener('click', async () => {
    if (!editingProductId) return;
    if (!confirm('Удалить товар?')) return;
    const msg = document.getElementById('product-msg');
    try {
        await deleteDoc(doc(db, 'products', editingProductId));
        msg.className = 'message success';
        msg.textContent = 'Удалено';
        await loadProducts();
        setTimeout(closeProduct, 600);
    } catch (e) {
        console.error(e);
        msg.className = 'message error';
        msg.textContent = 'Ошибка: ' + e.message;
    }
});

// ============================================================
// ФАЙЛЫ
// ============================================================
let allFiles = [];
let editingFileId = null;
let pendingFileData = null;
let pendingFileName = null;

async function loadFiles() {
    const box = document.getElementById('files-list');
    if (!box) return;
    box.innerHTML = '<div class="empty">Загрузка...</div>';
    try {
        const snap = await getDocs(collection(db, 'downloads'));
        allFiles = [];
        snap.forEach((d) => allFiles.push({ id: d.id, ...d.data() }));
        allFiles.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        renderFiles();
    } catch (e) {
        box.innerHTML = '<div class="empty">Ошибка: ' + e.message + '</div>';
        console.error(e);
    }
}

function renderFiles() {
    const box = document.getElementById('files-list');
    if (!allFiles.length) {
        box.innerHTML = '<div class="empty">Файлов нет</div>';
        return;
    }
    box.innerHTML = allFiles.map((f) => {
        const sizeKB = f.size ? Math.round(f.size / 1024) + ' КБ' : '—';
        return `
            <div class="file-row" data-id="${f.id}">
                <div class="file-row-icon">💾</div>
                <div class="file-row-info">
                    <div class="file-row-title">${escapeHtml(f.title || 'Без названия')}</div>
                    <div class="file-row-desc">${escapeHtml(f.description || '')}</div>
                </div>
                <div class="file-row-size">${sizeKB}</div>
            </div>
        `;
    }).join('');
    box.querySelectorAll('.file-row').forEach((el) => {
        el.addEventListener('click', () => openFile(el.dataset.id));
    });
}

document.getElementById('new-file-btn').addEventListener('click', () => {
    editingFileId = null;
    pendingFileData = null;
    pendingFileName = null;
    document.getElementById('file-modal-title').textContent = 'Новый файл';
    document.getElementById('file-title').value = '';
    document.getElementById('file-desc').value = '';
    document.getElementById('file-preview').textContent = '?';
    document.getElementById('file-msg').className = 'message';
    document.getElementById('file-delete').style.display = 'none';
    document.getElementById('file-modal').classList.add('open');
});

function openFile(id) {
    const f = allFiles.find((x) => x.id === id);
    if (!f) return;
    editingFileId = id;
    pendingFileData = null;
    pendingFileName = null;
    document.getElementById('file-modal-title').textContent = 'Редактирование файла';
    document.getElementById('file-title').value = f.title || '';
    document.getElementById('file-desc').value = f.description || '';
    document.getElementById('file-preview').textContent = '💾';
    document.getElementById('file-msg').className = 'message';
    document.getElementById('file-delete').style.display = 'block';
    document.getElementById('file-modal').classList.add('open');
}

document.getElementById('file-close').addEventListener('click', closeFile);
document.getElementById('file-modal').addEventListener('click', (e) => {
    if (e.target.id === 'file-modal') closeFile();
});
function closeFile() {
    document.getElementById('file-modal').classList.remove('open');
    editingFileId = null;
    pendingFileData = null;
    pendingFileName = null;
}

document.getElementById('file-pick').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 700 * 1024) {
        const msg = document.getElementById('file-msg');
        msg.className = 'message error';
        msg.textContent = 'Файл слишком большой: ' + Math.round(file.size / 1024) + ' КБ. Максимум 700 КБ.';
        e.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        pendingFileData = reader.result.split(',')[1];
        pendingFileName = file.name;
        document.getElementById('file-preview').textContent = '✓';
        if (!document.getElementById('file-title').value) {
            document.getElementById('file-title').value = file.name;
        }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
});

document.getElementById('file-save').addEventListener('click', async () => {
    const msg = document.getElementById('file-msg');
    const btn = document.getElementById('file-save');
    const title = document.getElementById('file-title').value.trim();
    const description = document.getElementById('file-desc').value.trim();

    if (!title) { msg.className = 'message error'; msg.textContent = 'Введите название'; return; }

    btn.disabled = true;
    try {
        if (editingFileId) {
            const upd = { title, description };
            if (pendingFileData) {
                upd.data = pendingFileData;
                upd.filename = pendingFileName;
                upd.size = Math.round(pendingFileData.length * 0.75);
            }
            await updateDoc(doc(db, 'downloads', editingFileId), upd);
            msg.className = 'message success';
            msg.textContent = 'Сохранено';
        } else {
            if (!pendingFileData) {
                msg.className = 'message error';
                msg.textContent = 'Выберите файл';
                btn.disabled = false;
                return;
            }
            await addDoc(collection(db, 'downloads'), {
                title, description,
                data: pendingFileData,
                filename: pendingFileName,
                size: Math.round(pendingFileData.length * 0.75),
                createdAt: serverTimestamp()
            });
            msg.className = 'message success';
            msg.textContent = 'Файл добавлен';
        }
        await loadFiles();
        setTimeout(closeFile, 800);
    } catch (e) {
        console.error(e);
        msg.className = 'message error';
        msg.textContent = 'Ошибка: ' + e.message;
    }
    btn.disabled = false;
});

document.getElementById('file-delete').addEventListener('click', async () => {
    if (!editingFileId) return;
    if (!confirm('Удалить файл?')) return;
    const msg = document.getElementById('file-msg');
    try {
        await deleteDoc(doc(db, 'downloads', editingFileId));
        msg.className = 'message success';
        msg.textContent = 'Удалено';
        await loadFiles();
        setTimeout(closeFile, 600);
    } catch (e) {
        console.error(e);
        msg.className = 'message error';
        msg.textContent = 'Ошибка: ' + e.message;
    }
});

// ============================================================
// О КОМПАНИИ
// ============================================================
async function loadCompany() {
    try {
        const snap = await getDoc(doc(db, 'config', 'main'));
        if (snap.exists()) {
            const d = snap.data();
            document.getElementById('company-title').value = d.companyTitle || 'HyoJoy Corporation';
            document.getElementById('company-desc').value = d.companyDescription || '';
        } else {
            document.getElementById('company-title').value = 'HyoJoy Corporation';
            document.getElementById('company-desc').value = '';
        }
    } catch (e) { console.error(e); }
}

document.getElementById('company-save').addEventListener('click', async () => {
    const title = document.getElementById('company-title').value.trim();
    const desc = document.getElementById('company-desc').value.trim();
    const msg = document.getElementById('company-msg');
    const btn = document.getElementById('company-save');
    btn.disabled = true;
    try {
        await setDoc(doc(db, 'config', 'main'), {
            companyTitle: title,
            companyDescription: desc,
            updatedAt: serverTimestamp()
        }, { merge: true });
        msg.className = 'message success';
        msg.textContent = 'Сохранено';
    } catch (e) {
        console.error(e);
        msg.className = 'message error';
        msg.textContent = 'Ошибка: ' + e.message;
    }
    btn.disabled = false;
});

// ============================================================
// ДИВИДЕНДЫ
// ============================================================
async function loadDividends() {
    try {
        const snap = await getDoc(doc(db, 'config', 'main'));
        if (snap.exists()) {
            const d = snap.data();
            document.getElementById('dividend-rate').value = ((d.dividendRate ?? 0.005) * 100).toFixed(2);
            document.getElementById('dividend-enabled').checked = d.dividendEnabled !== false;
        }
    } catch (e) { console.error(e); }
}

document.getElementById('dividend-save').addEventListener('click', async () => {
    const rate = parseFloat(document.getElementById('dividend-rate').value) / 100;
    const enabled = document.getElementById('dividend-enabled').checked;
    const msg = document.getElementById('dividend-msg');
    const btn = document.getElementById('dividend-save');
    btn.disabled = true;
    try {
        await setDoc(doc(db, 'config', 'main'), {
            dividendRate: rate,
            dividendEnabled: enabled,
            updatedAt: serverTimestamp()
        }, { merge: true });
        msg.className = 'message success';
        msg.textContent = 'Сохранено';
    } catch (e) {
        msg.className = 'message error';
        msg.textContent = 'Ошибка: ' + e.message;
    }
    btn.disabled = false;
});

// ============================================================
// ОБЛИГАЦИИ
// ============================================================
let allAdminBonds = [];
let editingBondId = null;

async function loadBonds() {
    const box = document.getElementById('admin-bonds-list');
    if (!box) return;
    box.innerHTML = '<div class="empty">Загрузка...</div>';
    try {
        const snap = await getDocs(collection(db, 'bonds'));
        allAdminBonds = [];
        snap.forEach((d) => allAdminBonds.push({ id: d.id, ...d.data() }));
        renderBondsAdmin();
    } catch (e) {
        box.innerHTML = '<div class="empty">Ошибка: ' + e.message + '</div>';
    }
}

function renderBondsAdmin() {
    const box = document.getElementById('admin-bonds-list');
    if (!allAdminBonds.length) {
        box.innerHTML = '<div class="empty">Облигаций нет</div>';
        return;
    }
    box.innerHTML = allAdminBonds.map((b) => `
        <div class="file-row" data-id="${b.id}" style="cursor:pointer;">
            <div class="file-row-icon">📜</div>
            <div class="file-row-info">
                <div class="file-row-title">${escapeHtml(b.name || 'Облигация')}</div>
                <div class="file-row-desc">${b.price}$ · ${b.days} дн. · ${(b.rate * 100).toFixed(2)}%</div>
            </div>
            <div class="file-row-size">${b.available === false ? 'ОТКЛ' : 'АКТИВ'}</div>
        </div>
    `).join('');
    box.querySelectorAll('.file-row').forEach((row) => {
        row.addEventListener('click', () => openBondEdit(row.dataset.id));
    });
}

document.getElementById('new-bond-btn').addEventListener('click', () => {
    editingBondId = null;
    document.getElementById('bond-modal-title').textContent = 'Новая облигация';
    document.getElementById('bond-name').value = '';
    document.getElementById('bond-price').value = '500';
    document.getElementById('bond-days').value = '7';
    document.getElementById('bond-rate').value = '5';
    document.getElementById('bond-delete').style.display = 'none';
    document.getElementById('bond-msg').className = 'message';
    document.getElementById('bond-modal').classList.add('open');
});

function openBondEdit(id) {
    const b = allAdminBonds.find((x) => x.id === id);
    if (!b) return;
    editingBondId = id;
    document.getElementById('bond-modal-title').textContent = 'Редактирование';
    document.getElementById('bond-name').value = b.name || '';
    document.getElementById('bond-price').value = b.price || 500;
    document.getElementById('bond-days').value = b.days || 7;
    document.getElementById('bond-rate').value = ((b.rate || 0.05) * 100).toFixed(2);
    document.getElementById('bond-delete').style.display = 'block';
    document.getElementById('bond-msg').className = 'message';
    document.getElementById('bond-modal').classList.add('open');
}

document.getElementById('bond-close').addEventListener('click', () => {
    document.getElementById('bond-modal').classList.remove('open');
    editingBondId = null;
});

document.getElementById('bond-save').addEventListener('click', async () => {
    const name = document.getElementById('bond-name').value.trim();
    const price = parseFloat(document.getElementById('bond-price').value);
    const days = parseInt(document.getElementById('bond-days').value, 10);
    const rate = parseFloat(document.getElementById('bond-rate').value) / 100;
    const msg = document.getElementById('bond-msg');

    if (!name || !price || !days || !rate) {
        msg.className = 'message error';
        msg.textContent = 'Заполни все поля';
        return;
    }

    try {
        if (editingBondId) {
            await updateDoc(doc(db, 'bonds', editingBondId), { name, price, days, rate });
        } else {
            await addDoc(collection(db, 'bonds'), {
                name, price, days, rate,
                available: true,
                createdAt: serverTimestamp()
            });
        }
        msg.className = 'message success';
        msg.textContent = 'Сохранено';
        await loadBonds();
        setTimeout(() => document.getElementById('bond-modal').classList.remove('open'), 600);
    } catch (e) {
        msg.className = 'message error';
        msg.textContent = 'Ошибка: ' + e.message;
    }
});

document.getElementById('bond-delete').addEventListener('click', async () => {
    if (!editingBondId) return;
    if (!confirm('Удалить облигацию?')) return;
    try {
        await deleteDoc(doc(db, 'bonds', editingBondId));
        await loadBonds();
        document.getElementById('bond-modal').classList.remove('open');
    } catch (e) {
        alert('Ошибка: ' + e.message);
    }
});

// ============================================================
// API КЛЮЧ
// ============================================================
async function loadApiKey() {
    const input = document.getElementById('api-key');
    const msg = document.getElementById('api-msg');
    try {
        const snap = await getDoc(doc(db, 'config', 'main'));
        if (snap.exists() && snap.data().apiKey) {
            input.value = snap.data().apiKey;
        } else {
            input.value = '';
        }
    } catch (e) {
        console.error(e);
        msg.className = 'message error';
        msg.textContent = 'Ошибка загрузки: ' + e.message;
    }
}

document.getElementById('api-save').addEventListener('click', async () => {
    const key = document.getElementById('api-key').value.trim();
    const msg = document.getElementById('api-msg');
    const btn = document.getElementById('api-save');
    btn.disabled = true;
    try {
        await setDoc(doc(db, 'config', 'main'), {
            apiKey: key,
            updatedAt: serverTimestamp()
        }, { merge: true });
        msg.className = 'message success';
        msg.textContent = 'Ключ сохранён';
    } catch (e) {
        console.error(e);
        msg.className = 'message error';
        msg.textContent = 'Ошибка: ' + e.message;
    }
    btn.disabled = false;
});

document.getElementById('api-clear').addEventListener('click', async () => {
    if (!confirm('Очистить API-ключ?')) return;
    const msg = document.getElementById('api-msg');
    try {
        await setDoc(doc(db, 'config', 'main'), {
            apiKey: '',
            updatedAt: serverTimestamp()
        }, { merge: true });
        document.getElementById('api-key').value = '';
        msg.className = 'message success';
        msg.textContent = 'Ключ очищен';
    } catch (e) {
        console.error(e);
        msg.className = 'message error';
        msg.textContent = 'Ошибка: ' + e.message;
    }
});

// ===== Init =====
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    currentUser = user;
});