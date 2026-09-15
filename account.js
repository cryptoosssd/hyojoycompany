// ===== Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth, onAuthStateChanged, updateProfile,
    EmailAuthProvider, reauthenticateWithCredential, updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, doc, getDoc, updateDoc, setDoc, deleteDoc
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
let pendingAvatarData = null;
let usernameAvailable = null;
let usernameCheckTimer = null;

// ===== Утилиты =====
function showMessage(id, text, type) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = 'message ' + type;
    setTimeout(() => { el.className = 'message'; }, 4000);
}
function translateError(code) {
    const map = {
        'auth/invalid-credential': 'Неверный пароль',
        'auth/wrong-password': 'Неверный пароль',
        'auth/weak-password': 'Пароль слишком простой',
        'auth/too-many-requests': 'Слишком много попыток',
        'auth/requires-recent-login': 'Войдите заново'
    };
    return map[code] || 'Ошибка: ' + code;
}
function isValidUsername(u) {
    return /^[a-z0-9_]{3,30}$/.test(u);
}

// ===== Аватар =====
function processImage(file, size = 256) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const side = Math.min(img.width, img.height);
                const sx = (img.width - side) / 2;
                const sy = (img.height - side) / 2;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Ошибка чтения файла'));
        reader.readAsDataURL(file);
    });
}

function renderAvatarPreview(dataUrl, nick) {
    const box = document.getElementById('avatar-preview');
    if (dataUrl) {
        box.innerHTML = `<img src="${dataUrl}" alt="avatar">`;
    } else {
        box.innerHTML = '';
        box.textContent = (nick || '?').charAt(0).toUpperCase();
    }
}

// ===== Init =====
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    currentUser = user;
    const nick = user.displayName || user.email.split('@')[0];
    document.getElementById('new-nick').value = nick;

    try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.exists() ? snap.data() : {};

        // Аватар
        if (data.avatar) {
            renderAvatarPreview(data.avatar, nick);
            document.getElementById('remove-avatar-btn').style.display = 'block';
        } else {
            renderAvatarPreview(null, nick);
        }

        // Юзернейм
        document.getElementById('username-input').value = data.username || '';

        // Профиль
        document.getElementById('edit-custom-status').value = data.customStatus || '';
        document.getElementById('edit-bio').value = data.bio || '';
        document.getElementById('edit-location').value = data.location || '';
        document.getElementById('edit-birthday').value = data.birthday || '';
        document.getElementById('edit-games').value = (data.favoriteGames || []).join(', ');
        document.getElementById('edit-movies').value = (data.favoriteMovies || []).join(', ');

        // Ссылки
        document.getElementById('edit-site').value = data.linkSite || '';
        document.getElementById('edit-discord').value = data.linkDiscord || '';
        document.getElementById('edit-telegram').value = data.linkTelegram || '';
    } catch (e) {
        console.error(e);
        renderAvatarPreview(null, nick);
    }
});

// ============================================================
// ЮЗЕРНЕЙМ
// ============================================================
const usernameInput = document.getElementById('username-input');
const usernameHint = document.getElementById('username-hint');
const usernameSaveBtn = document.getElementById('username-save-btn');

usernameInput.addEventListener('input', () => {
    const u = usernameInput.value.trim().toLowerCase();
    usernameInput.value = u;

    clearTimeout(usernameCheckTimer);
    usernameAvailable = null;
    usernameHint.className = 'username-hint';

    if (!u) {
        usernameHint.textContent = '3–30 символов, латиница, цифры, _';
        return;
    }
    if (!isValidUsername(u)) {
        usernameHint.textContent = 'Только латиница, цифры, _. Минимум 3 символа.';
        usernameHint.className = 'username-hint busy';
        return;
    }

    usernameHint.textContent = 'Проверка...';

    usernameCheckTimer = setTimeout(async () => {
        try {
            const snap = await getDoc(doc(db, 'usernames', u));
            if (snap.exists() && snap.data().uid !== currentUser.uid) {
                usernameHint.textContent = 'Занят';
                usernameHint.className = 'username-hint busy';
                usernameAvailable = false;
                return;
            }
            usernameHint.textContent = 'Свободен';
            usernameHint.className = 'username-hint ok';
            usernameAvailable = true;
        } catch (e) {
            console.error(e);
            usernameHint.textContent = 'Ошибка проверки';
            usernameHint.className = 'username-hint busy';
        }
    }, 400);
});

usernameSaveBtn.addEventListener('click', async () => {
    const newUsername = usernameInput.value.trim().toLowerCase();

    if (!newUsername) return showMessage('username-msg', 'Введите юзернейм', 'error');
    if (!isValidUsername(newUsername)) return showMessage('username-msg', 'Только латиница, цифры, _. Минимум 3 символа.', 'error');
    if (usernameAvailable !== true) return showMessage('username-msg', 'Юзернейм занят или не проверен', 'error');

    usernameSaveBtn.disabled = true;

    try {
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
        const oldUsername = userSnap.exists() ? (userSnap.data().username || '') : '';

        if (oldUsername === newUsername) {
            showMessage('username-msg', 'Это ваш текущий юзернейм', 'success');
            usernameSaveBtn.disabled = false;
            return;
        }

        // Ещё раз проверяем
        const checkSnap = await getDoc(doc(db, 'usernames', newUsername));
        if (checkSnap.exists() && checkSnap.data().uid !== currentUser.uid) {
            showMessage('username-msg', 'Юзернейм занят', 'error');
            usernameSaveBtn.disabled = false;
            return;
        }

        // Удаляем старый
        if (oldUsername) {
            try { await deleteDoc(doc(db, 'usernames', oldUsername)); } catch (e) {}
        }

        // Создаём новый
        await setDoc(doc(db, 'usernames', newUsername), {
            uid: currentUser.uid,
            createdAt: new Date().toISOString()
        });

        // Обновляем в users
        await updateDoc(doc(db, 'users', currentUser.uid), {
            username: newUsername
        });

        showMessage('username-msg', 'Юзернейм сохранён', 'success');
        usernameAvailable = null;
    } catch (e) {
        console.error(e);
        showMessage('username-msg', 'Ошибка: ' + e.message, 'error');
    }
    usernameSaveBtn.disabled = false;
});

// ============================================================
// АВАТАР
// ============================================================
document.getElementById('pick-avatar-btn').addEventListener('click', () => {
    document.getElementById('avatar-input').click();
});

document.getElementById('avatar-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const dataUrl = await processImage(file);
        pendingAvatarData = dataUrl;
        renderAvatarPreview(dataUrl, currentUser.displayName || '');
        document.getElementById('save-avatar-btn').style.display = 'block';
    } catch (err) {
        showMessage('avatar-msg', err.message, 'error');
    }
    e.target.value = '';
});

document.getElementById('save-avatar-btn').addEventListener('click', async () => {
    if (!pendingAvatarData) return;
    const btn = document.getElementById('save-avatar-btn');
    btn.disabled = true;
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            avatar: pendingAvatarData
        });
        showMessage('avatar-msg', 'Аватар сохранён', 'success');
        document.getElementById('remove-avatar-btn').style.display = 'block';
        document.getElementById('save-avatar-btn').style.display = 'none';
        pendingAvatarData = null;
    } catch (e) {
        showMessage('avatar-msg', 'Ошибка: ' + e.message, 'error');
    }
    btn.disabled = false;
});

document.getElementById('remove-avatar-btn').addEventListener('click', async () => {
    const btn = document.getElementById('remove-avatar-btn');
    btn.disabled = true;
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), { avatar: null });
        const nick = currentUser.displayName || currentUser.email.split('@')[0];
        renderAvatarPreview(null, nick);
        document.getElementById('remove-avatar-btn').style.display = 'none';
        document.getElementById('save-avatar-btn').style.display = 'none';
        pendingAvatarData = null;
        showMessage('avatar-msg', 'Аватар удалён', 'success');
    } catch (e) {
        showMessage('avatar-msg', 'Ошибка: ' + e.message, 'error');
    }
    btn.disabled = false;
});

// ============================================================
// НИК
// ============================================================
document.getElementById('nick-btn').addEventListener('click', async () => {
    const newNick = document.getElementById('new-nick').value.trim();
    const pass = document.getElementById('nick-pass').value;

    if (!newNick || !pass) return showMessage('nick-msg', 'Заполните все поля', 'error');
    if (newNick.length < 3) return showMessage('nick-msg', 'Ник минимум 3 символа', 'error');
    if (!/^[a-zA-Z0-9_]+$/.test(newNick)) return showMessage('nick-msg', 'Только латиница, цифры, _', 'error');

    const btn = document.getElementById('nick-btn');
    btn.disabled = true;
    try {
        const cred = EmailAuthProvider.credential(currentUser.email, pass);
        await reauthenticateWithCredential(currentUser, cred);
        await updateProfile(currentUser, { displayName: newNick });
        await updateDoc(doc(db, 'users', currentUser.uid), { nick: newNick });
        showMessage('nick-msg', 'Ник обновлён', 'success');
    } catch (e) {
        showMessage('nick-msg', translateError(e.code), 'error');
    }
    btn.disabled = false;
});

// ============================================================
// ПАРОЛЬ
// ============================================================
document.getElementById('pass-btn').addEventListener('click', async () => {
    const oldPass = document.getElementById('old-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const newPass2 = document.getElementById('new-pass2').value;

    if (!oldPass || !newPass || !newPass2) return showMessage('pass-msg', 'Заполните все поля', 'error');
    if (newPass.length < 6) return showMessage('pass-msg', 'Пароль минимум 6 символов', 'error');
    if (newPass !== newPass2) return showMessage('pass-msg', 'Пароли не совпадают', 'error');

    const btn = document.getElementById('pass-btn');
    btn.disabled = true;
    try {
        const cred = EmailAuthProvider.credential(currentUser.email, oldPass);
        await reauthenticateWithCredential(currentUser, cred);
        await updatePassword(currentUser, newPass);
        showMessage('pass-msg', 'Пароль обновлён', 'success');
        document.getElementById('old-pass').value = '';
        document.getElementById('new-pass').value = '';
        document.getElementById('new-pass2').value = '';
    } catch (e) {
        showMessage('pass-msg', translateError(e.code), 'error');
    }
    btn.disabled = false;
});

// ============================================================
// ПРОФИЛЬ
// ============================================================
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-profile-btn');
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

        showMessage('profile-msg', 'Профиль сохранён', 'success');
    } catch (e) {
        console.error(e);
        showMessage('profile-msg', 'Ошибка: ' + e.message, 'error');
    }
    btn.disabled = false;
});