// ============================================================
// HyoJoy — универсальная адаптация под телефон/планшет
// Ничего в HTML/CSS не меняет — только добавляет стили поверх
// ============================================================
(function () {
    'use strict';

    // ===== Мета-тег viewport =====
    if (!document.querySelector('meta[name="viewport"]')) {
        var meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0';
        document.head.appendChild(meta);
    }

    // ===== Стили =====
    var css = `
/* ============ BASE ============ */
html, body {
    max-width: 100%;
    overflow-x: hidden;
}
img, video, canvas, svg, iframe {
    max-width: 100%;
    height: auto;
}
body {
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
}
input, select, textarea, button {
    font-size: 16px !important;
    max-width: 100%;
    touch-action: manipulation;
}
button, .btn, .nav-btn, .tab, .dropdown-item, a {
    min-height: 36px;
}

/* ============ TABLET (<= 900px) ============ */
@media (max-width: 900px) {
    .main {
        padding: 30px 24px !important;
        max-width: 100% !important;
    }
    .container {
        width: 100% !important;
        max-width: 100% !important;
        padding: 24px 20px !important;
    }
    .grid,
    .cards,
    .stats,
    .trade-balance,
    .stats-grid,
    .dv-info,
    .ticker-card .stats {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 10px !important;
    }
    .products-list,
    .bonds-list {
        grid-template-columns: repeat(2, 1fr) !important;
    }
    .header {
        padding: 12px 20px !important;
        flex-wrap: wrap !important;
        gap: 10px !important;
    }
    .nav {
        gap: 14px !important;
        flex-wrap: wrap !important;
    }
    .nav-btn {
        font-size: 12px !important;
        letter-spacing: 1px !important;
        padding: 6px 2px !important;
    }
    .ticker-card,
    .trade-card,
    .orderbook-card,
    .dividend-card,
    .posts-card,
    .comments-card,
    .profile-hero,
    .info-card,
    .level-card,
    .company-section,
    .downloads-section {
        padding: 20px !important;
        width: 100% !important;
        max-width: 100% !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
    }
    .avatar-big {
        width: 90px !important;
        height: 90px !important;
        font-size: 34px !important;
    }
    .price,
    .pc-value,
    .card-value {
        font-size: 32px !important;
    }
    .hero h1,
    .main h1,
    h1 {
        font-size: 26px !important;
    }
    .info-block {
        grid-template-columns: 130px 1fr !important;
    }
    .trade-links,
    .orderbook-card .ob-columns,
    .tabs,
    .ipanel .dv-info {
        grid-template-columns: 1fr !important;
    }
    .trade-buttons {
        grid-template-columns: 1fr 1fr !important;
    }
}

/* ============ MOBILE (<= 600px) ============ */
@media (max-width: 600px) {
    .main {
        padding: 20px 14px !important;
    }
    .container {
        padding: 20px 16px !important;
    }

    /* Шапка — вертикально */
    .header {
        flex-direction: column !important;
        align-items: stretch !important;
        padding: 12px 14px !important;
        gap: 12px !important;
    }
    .header .logo {
        font-size: 16px !important;
        letter-spacing: 2px !important;
        text-align: center !important;
    }
    .header-right {
        display: flex !important;
        justify-content: center !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
    }
    .nav {
        justify-content: center !important;
        gap: 8px 14px !important;
    }
    .nav-btn {
        font-size: 11px !important;
        padding: 6px 2px !important;
        letter-spacing: 1px !important;
    }

    /* Сетки в одну колонку */
    .grid,
    .cards,
    .stats,
    .trade-balance,
    .stats-grid,
    .dv-info,
    .products-list,
    .bonds-list,
    .ticker-card .stats,
    .trade-buttons,
    .trade-links,
    .follows-row,
    .tabs,
    .form-row,
    .field-row {
        grid-template-columns: 1fr !important;
        gap: 10px !important;
    }

    /* Профиль */
    .profile-hero {
        flex-direction: column !important;
        text-align: center !important;
        padding: 20px 16px !important;
    }
    .hero-actions {
        width: 100% !important;
        align-items: stretch !important;
    }
    .hero-actions button {
        width: 100% !important;
    }
    .nick-big {
        font-size: 22px !important;
    }
    .avatar-big {
        width: 80px !important;
        height: 80px !important;
        font-size: 30px !important;
    }

    /* Формы */
    input,
    textarea,
    select {
        padding: 12px !important;
        font-size: 15px !important;
    }

    /* Прочее */
    .hero h1,
    .main h1,
    h1 {
        font-size: 22px !important;
        letter-spacing: 1px !important;
    }
    .price,
    .pc-value,
    .card-value,
    .market-price {
        font-size: 26px !important;
    }
    .symbol {
        font-size: 18px !important;
    }
    .chart-wrap {
        height: 220px !important;
    }
    .ticker-card,
    .trade-card,
    .orderbook-card,
    .dividend-card,
    .posts-card,
    .comments-card,
    .info-card,
    .level-card,
    .company-section,
    .downloads-section {
        padding: 16px !important;
    }
    .info-block {
        grid-template-columns: 1fr !important;
        gap: 4px !important;
    }
    .info-label {
        font-size: 10px !important;
    }
    .nick-row {
        flex-wrap: wrap !important;
        justify-content: center !important;
    }
    .nick-big,
    .username-line,
    .status-line,
    .tag-line,
    .custom-status {
        text-align: center !important;
    }
    .msg {
        max-width: 92% !important;
    }
    .msg-row {
        max-width: 95% !important;
    }
    .download-item,
    .post-item,
    .comment-item,
    .order-row,
    .trade-row,
    .user-row {
        flex-wrap: wrap !important;
        gap: 10px !important;
    }
    .download-btn,
    .link-btn,
    .btn {
        width: 100% !important;
    }

    /* Таблицы */
    table {
        font-size: 12px !important;
    }
    th, td {
        padding: 10px 8px !important;
    }

    /* Онлайн-виджет */
    #hyojoy-online {
        bottom: 10px !important;
        left: 10px !important;
    }
    .online-pill {
        padding: 8px 12px !important;
        font-size: 11px !important;
    }
    .online-dropdown {
        min-width: 220px !important;
        max-width: 90vw !important;
    }

    /* Модалки */
    .modal-content {
        width: 100% !important;
        max-width: 100% !important;
        max-height: 95vh !important;
        margin: 0 !important;
    }
    .modal {
        padding: 10px !important;
    }
    .modal-body {
        padding: 14px !important;
    }
    .modal-head {
        padding: 12px 14px !important;
    }
    .modal-title {
        font-size: 12px !important;
    }
}

/* ============ SMALL MOBILE (<= 400px) ============ */
@media (max-width: 400px) {
    .main {
        padding: 16px 10px !important;
    }
    .container {
        padding: 16px 12px !important;
    }
    .nav-btn {
        font-size: 10px !important;
    }
    .ticker-card,
    .trade-card,
    .orderbook-card,
    .dividend-card,
    .posts-card,
    .comments-card,
    .info-card {
        padding: 12px !important;
    }
    h1, .hero h1 {
        font-size: 18px !important;
    }
    .price,
    .pc-value,
    .card-value {
        font-size: 22px !important;
    }
    .avatar-big {
        width: 70px !important;
        height: 70px !important;
        font-size: 26px !important;
    }
}

/* ============ TOUCH (палец) ============ */
@media (pointer: coarse) {
    .nav-btn,
    .tab,
    .back-btn,
    .btn,
    button {
        min-height: 40px !important;
    }
    .dropdown-item {
        padding: 16px 18px !important;
    }
}

/* ============ Ориентация ============ */
@media (max-width: 900px) and (orientation: landscape) {
    .header {
        flex-direction: row !important;
        flex-wrap: wrap !important;
    }
    .stats-grid,
    .cards {
        grid-template-columns: repeat(3, 1fr) !important;
    }
}

/* ============ Дополнительно ============ */
@media (max-width: 600px) {
    body {
        font-size: 14px;
    }
    pre, code {
        white-space: pre-wrap !important;
        word-break: break-word !important;
    }
    .dropdown {
        min-width: 90vw !important;
        right: 5vw !important;
    }
}
`;

    // Вставляем стили в <head>
    var style = document.createElement('style');
    style.setAttribute('data-hyojoy-responsive', 'true');
    style.textContent = css;
    document.head.appendChild(style);

    // ===== Мелкие JS-правки =====

    // 1. Убираем outline при тапе (не мешает фокусу)
    document.addEventListener('touchstart', function () {}, { passive: true });

    // 2. Клики по <a> с курсором — не даём "залипать" hover
    document.addEventListener('touchstart', function (e) {
        var t = e.target.closest('a, button, .nav-btn, .tab, .dropdown-item');
        if (t) t.classList.add('touch-active');
    }, { passive: true });
    document.addEventListener('touchend', function () {
        document.querySelectorAll('.touch-active').forEach(function (el) {
            el.classList.remove('touch-active');
        });
    }, { passive: true });

    // 3. Закрываем dropdown при клике вне — на тач работает через touchend
    document.addEventListener('touchend', function (e) {
        var dd = document.getElementById('dropdown');
        if (!dd) return;
        if (!e.target.closest('.avatar-wrap')) {
            dd.classList.remove('open');
        }
    }, { passive: true });

    // 4. Стиль .touch-active
    var styleTouch = document.createElement('style');
    styleTouch.textContent = `
        .touch-active {
            opacity: 0.6;
        }
    `;
    document.head.appendChild(styleTouch);

    // 5. Логируем, что скрипт загружен
    console.log('[HyoJoy] responsive.js загружен — сайт адаптирован под мобильные');
})();