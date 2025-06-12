// Імпортуємо необхідні модулі з Firebase
import { db, functions } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, where, addDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js";

// Весь код виконується після повного завантаження сторінки
document.addEventListener('DOMContentLoaded', () => {
    // ---- ГЛОБАЛЬНІ ЗМІННІ ТА КОНСТАНТИ ----

    // Ініціалізація API Telegram та TON Connect
    const tg = window.Telegram?.WebApp;
    const TON_CONNECT_UI = window.TON_CONNECT_UI;

    if (!tg || !TON_CONNECT_UI) {
        console.error("Ключові скрипти Telegram або TON Connect не завантажено!");
        document.body.innerHTML = 'Помилка завантаження. Будь ласка, перезапустіть додаток.';
        return;
    }

    tg.ready();
    tg.expand();

    const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: 'https://weebwe.github.io/WeeClick/manifest.json',
        buttonRootId: 'ton-connect-header'
    });

    // Отримання посилань на DOM-елементи
    const loaderScreen = document.getElementById('loader-screen');
    const progressBar = document.getElementById('progress-bar');
    const mainApp = document.getElementById('main-app');
    const scoreDisplay = document.getElementById('score-display');
    const score2Display = document.getElementById('score2-display');
    const livesDisplay = document.getElementById('lives-display');
    const clickerButton = document.getElementById('clicker-button');
    const clickerContainer = document.getElementById('clicker-button-container');
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const profileBtn = document.getElementById('profile-btn');
    const profileModal = document.getElementById('profile-modal');
    const profileModalBackdrop = document.getElementById('profile-modal-backdrop');
    const profileModalContent = document.getElementById('profile-modal-content');
    const closeProfileBtn = document.getElementById('close-profile-btn');
    const userPhoto = document.getElementById('user-photo');
    const userName = document.getElementById('user-name');
    const userUsername = document.getElementById('user-username');
    const walletAddressP = document.getElementById('wallet-address');
    const profileScoreDisplay = document.getElementById('profile-score-display');
    const profileScore2Display = document.getElementById('profile-score2-display');
    const toggleMusicBtn = document.getElementById('toggle-music-btn');
    const toggleEffectsBtn = document.getElementById('toggle-effects-btn');
    const inviteFriendBtn = document.getElementById('invite-friend-btn');
    const exchangeInput = document.getElementById('exchange-input');
    const exchangeBtn = document.getElementById('exchange-btn');
    const leaderboardTabs = document.querySelectorAll('.leaderboard-tab');
    const leaderboardList = document.getElementById('leaderboard-list');
    const monthlyLeaderboardInfo = document.getElementById('monthly-leaderboard-info');
    const seasonTimer = document.getElementById('season-timer');
    const customTasksContainer = document.getElementById('custom-tasks-container');

    // Стан гри
    let score = 0, score2 = 10, lives = 3, monthlyScore = 0;
    let completedTasks = [], isMusicEnabled = true, areEffectsEnabled = true;
    let playerDocRef, userId;
    let isMusicUnmuted = false; // Прапорець для авто-відтворення музики
    let seasonTimerInterval = null; // ID інтервалу для таймера сезону
    let clicksBuffer = 0; // Буфер кліків для відправки на сервер

    // Аудіо
    const clickSound = new Audio('sounds/click.mp3');
    const backgroundMusic = new Audio('sounds/background.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3;

    // ---- ОСНОВНА ЛОГІКА ----

    /**
     * Ініціалізує додаток: отримує дані користувача, завантажує прогрес, налаштовує обробники.
     */
    async function initializeApp() {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            console.error("Ідентифікація користувача Telegram не вдалася.");
            document.body.innerHTML = "Помилка ідентифікації. Будь ласка, перезапустіть додаток.";
            return;
        }

        userId = user.id.toString();
        playerDocRef = doc(db, "players", userId);

        try {
            const docSnap = await getDoc(playerDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                score = data.score ?? 0;
                score2 = data.score2 ?? 10;
                lives = data.lives ?? 3;
                monthlyScore = data.monthlyScore ?? 0;
                completedTasks = data.completedTasks ?? [];
                isMusicEnabled = data.settings?.isMusicEnabled ?? true;
                areEffectsEnabled = data.settings?.areEffectsEnabled ?? true;
            } else {
                const initialData = {
                    score: 0, score2: 10, lives: 3, monthlyScore: 0,
                    completedTasks: [],
                    firstName: user.first_name || "Guest",
                    username: user.username || "unknown",
                    photo_url: user.photo_url || null,
                    createdAt: serverTimestamp(),
                    settings: { isMusicEnabled: true, areEffectsEnabled: true },
                    referredBy: null
                };
                const startParam = tg.initDataUnsafe?.start_param;
                if (startParam && startParam.startsWith('ref_')) {
                    const referrerId = startParam.substring(4);
                    if (referrerId !== userId) initialData.referredBy = referrerId;
                }
                await setDoc(playerDocRef, initialData);
                // Встановлюємо локальні змінні з початкових даних
                ({ score, score2, lives, monthlyScore, completedTasks } = initialData);
                isMusicEnabled = initialData.settings.isMusicEnabled;
                areEffectsEnabled = initialData.settings.areEffectsEnabled;
            }
        } catch (error) {
            console.error("Помилка при роботі з Firestore:", error);
            tg.showAlert("Не вдалося завантажити профіль. Перевірте з'єднання з інтернетом.");
            return;
        }

        populateProfileData(user);
        updateAllStatsUI();
        updateSettingsUI();
        setupEventListeners();
        showPage('home-page');
        startLoadingSimulation();
    }

    /**
     * Зберігає налаштування або некритичні дані на сервері.
     * @param {object} dataToSave - Об'єкт з даними для оновлення.
     */
    async function saveNonCriticalProgress(dataToSave) {
        if (!playerDocRef) return;
        try {
            await updateDoc(playerDocRef, dataToSave);
        } catch (error) {
            console.error("Помилка збереження прогресу:", error);
        }
    }

    /**
     * Імітація завантаження для кращого користувацького досвіду.
     */
    function startLoadingSimulation() {
        if (isMusicEnabled) {
            backgroundMusic.muted = true; // Музика почнеться тихо, користувач увімкне її кліком
            backgroundMusic.play().catch(e => console.warn("Не вдалося запустити музику автоматично."));
        }
        let progress = 0;
        const interval = setInterval(() => {
            progress += 1;
            if (progressBar) progressBar.style.width = progress + '%';
            if (progress >= 100) {
                clearInterval(interval);
                if (loaderScreen) loaderScreen.style.opacity = '0';
                if (mainApp) {
                    mainApp.classList.remove('hidden');
                    mainApp.classList.add('flex');
                }
                setTimeout(() => {
                    if (loaderScreen) loaderScreen.style.display = 'none';
                }, 500);
            }
        }, 25);
    }
    
    /**
     * Заповнює дані профілю користувача в UI.
     * @param {object} user - Об'єкт користувача від Telegram.
     */
    function populateProfileData(user) {
        if (!user) return;
        userName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Guest';
        userUsername.textContent = user.username ? `@${user.username}` : 'No username';
        if (user.photo_url) userPhoto.src = user.photo_url;
        document.getElementById('copyright-year').textContent = new Date().getFullYear().toString();
    }

    // ---- ОБРОБНИКИ ПОДІЙ ----

    /**
     * Встановлює всі основні обробники подій.
     */
    function setupEventListeners() {
        clickerButton.addEventListener('click', handleSafeClick);
        toggleMusicBtn.addEventListener('click', toggleMusic);
        toggleEffectsBtn.addEventListener('click', toggleEffects);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && clicksBuffer > 0) {
                sendClicksToServer();
            }
        });
        navItems.forEach(item => item.addEventListener('click', () => {
            showPage(item.dataset.page);
            updateActiveNavItem(item);
        }));
        profileBtn.addEventListener('click', showProfileModal);
        closeProfileBtn.addEventListener('click', hideProfileModal);
        profileModalBackdrop.addEventListener('click', hideProfileModal);
        tonConnectUI.onStatusChange(updateWalletUI);
        exchangeBtn.addEventListener('click', handleSafeExchange);
        inviteFriendBtn.addEventListener('click', handleInvite);
        leaderboardTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                leaderboardTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const type = tab.dataset.leaderboard;
                monthlyLeaderboardInfo.classList.toggle('hidden', type !== 'monthly');
                loadLeaderboard(type);
            });
        });
    }

    /**
     * БЕЗПЕЧНА обробка кліку. Оновлює UI миттєво, а дані відправляє на сервер пакетами.
     * @param {Event} event - Подія кліку.
     */
    function handleSafeClick(event) {
        if (isMusicEnabled && !isMusicUnmuted) {
            backgroundMusic.muted = false;
            isMusicUnmuted = true;
        }
        
        score++;
        monthlyScore++;
        clicksBuffer++;
        
        updateAllStatsUI();
        animateClick(event);
        
        // Відправляємо накопичені кліки на сервер кожні 15 кліків
        if (clicksBuffer >= 15) {
            sendClicksToServer();
        }
    }

    /**
     * БЕЗПЕЧНА відправка даних про кліки на хмарну функцію.
     */
    async function sendClicksToServer() {
        if (clicksBuffer === 0) return;
        const clicksToSend = clicksBuffer;
        clicksBuffer = 0; // Скидаємо буфер одразу, щоб уникнути подвійних відправок

        try {
            // ВАЖЛИВО: Вам потрібно створити хмарну функцію з назвою 'incrementScore'
            const incrementScore = httpsCallable(functions, 'incrementScore');
            await incrementScore({ amount: clicksToSend });
        } catch (error) {
            console.error("Помилка при відправці кліків на сервер:", error);
            clicksBuffer += clicksToSend; // Повертаємо кліки в буфер у разі помилки
        }
    }
    
    /**
     * БЕЗПЕЧНИЙ обмін валюти через хмарну функцію.
     */
    async function handleSafeExchange() {
        const rate = 1_000_000;
        const amount = parseInt(exchangeInput.value);

        if (isNaN(amount) || amount <= 0) {
            return tg.showAlert("Введіть коректну кількість для обміну.");
        }
        if (amount % rate !== 0) {
            return tg.showAlert(`Сума має бути кратною ${rate.toLocaleString('uk-UA')}.`);
        }

        exchangeBtn.disabled = true;
        exchangeBtn.textContent = 'Обробка...';

        try {
            // ВАЖЛИВО: Вам потрібно створити хмарну функцію з назвою 'exchangeCurrency'
            const exchangeCurrency = httpsCallable(functions, 'exchangeCurrency');
            const result = await exchangeCurrency({ amountToExchange: amount });

            if (result.data.success) {
                // Оновлюємо локальні дані з відповіді сервера
                score = result.data.newScore;
                score2 = result.data.newScore2;
                updateAllStatsUI();
                exchangeInput.value = '';
                tg.showAlert(`Ви успішно обміняли ${amount.toLocaleString('uk-UA')} монет на ${result.data.receivedAmount.toLocaleString('uk-UA')} WEE!`);
            } else {
                tg.showAlert(result.data.message || 'Помилка обміну.');
            }
        } catch (error) {
            console.error("Серверна помилка при обміні:", error);
            tg.showAlert('Не вдалося виконати обмін. Спробуйте пізніше.');
        } finally {
            exchangeBtn.disabled = false;
            exchangeBtn.textContent = 'Обміняти';
        }
    }

    function toggleMusic() {
        isMusicEnabled = !isMusicEnabled;
        updateSettingsUI();
        saveNonCriticalProgress({ 'settings.isMusicEnabled': isMusicEnabled });
        isMusicEnabled ? backgroundMusic.play().catch(e => {}) : backgroundMusic.pause();
    }

    function toggleEffects() {
        areEffectsEnabled = !areEffectsEnabled;
        updateSettingsUI();
        saveNonCriticalProgress({ 'settings.areEffectsEnabled': areEffectsEnabled });
    }

    // ---- ОНОВЛЕННЯ UI ----

    function updateSettingsUI() {
        if (!toggleMusicBtn || !toggleEffectsBtn) return;
        const musicIcon = toggleMusicBtn.querySelector('i');
        const effectsIcon = toggleEffectsBtn.querySelector('i');
        toggleMusicBtn.classList.toggle('active', isMusicEnabled);
        musicIcon.className = isMusicEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
        toggleEffectsBtn.classList.toggle('active', areEffectsEnabled);
        effectsIcon.className = areEffectsEnabled ? 'fas fa-star' : 'fas fa-star-half-alt';
    }
    
    function updateAllStatsUI() {
        const fScore = score.toLocaleString('uk-UA');
        const fScore2 = score2.toLocaleString('uk-UA');
        if (scoreDisplay) scoreDisplay.textContent = fScore;
        if (profileScoreDisplay) profileScoreDisplay.textContent = fScore;
        if (score2Display) score2Display.textContent = fScore2;
        if (profileScore2Display) profileScore2Display.textContent = fScore2;
        if (livesDisplay) livesDisplay.textContent = lives.toString();
    }

    function animateClick(e) {
        if (areEffectsEnabled) {
            clickSound.currentTime = 0;
            clickSound.play().catch(e => {});
        }
        const animation = document.createElement('span');
        animation.className = 'click-animation';
        animation.textContent = '+1';
        const rect = clickerContainer.getBoundingClientRect();
        animation.style.left = `${e.clientX - rect.left - 15}px`;
        animation.style.top = `${e.clientY - rect.top - 30}px`;
        clickerContainer.appendChild(animation);
        setTimeout(() => animation.remove(), 1000);
    }
    
    function showPage(pageId) {
        pages.forEach(p => p.classList.toggle('page-active', p.id === pageId));
        
        // Ефективне керування таймером
        if (pageId === 'leaders-page') {
            if (!seasonTimerInterval) {
                updateSeasonTimer(); // Оновити одразу
                seasonTimerInterval = setInterval(updateSeasonTimer, 1000);
            }
            const activeTab = document.querySelector('.leaderboard-tab.active')?.dataset.leaderboard || 'all-time';
            loadLeaderboard(activeTab);
        } else {
            if (seasonTimerInterval) {
                clearInterval(seasonTimerInterval);
                seasonTimerInterval = null;
            }
        }

        if (pageId === 'tasks-page') {
            // Логіка завантаження завдань, якщо потрібно
        }
    }
    
    function updateActiveNavItem(activeItem) {
        navItems.forEach(item => item.classList.remove('active'));
        activeItem.classList.add('active');
    }

    function showProfileModal() {
        updateAllStatsUI();
        updateWalletUI(tonConnectUI.wallet);
        profileModal.classList.remove('hidden');
        setTimeout(() => {
            profileModalBackdrop.classList.remove('opacity-0');
            profileModalContent.classList.remove('scale-95', 'opacity-0');
        }, 10);
    }

    function hideProfileModal() {
        profileModalBackdrop.classList.add('opacity-0');
        profileModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => profileModal.classList.add('hidden'), 300);
    }

    function updateWalletUI(wallet) {
        if (wallet) {
            const address = TON_CONNECT_UI.toUserFriendlyAddress(wallet.account.address, wallet.account.chain === '-3');
            walletAddressP.textContent = address;
            walletAddressP.classList.add('text-blue-700', 'bg-blue-50');
            walletAddressP.classList.remove('text-gray-600', 'bg-gray-100');
        } else {
            walletAddressP.textContent = 'Гаманець не підключено';
            walletAddressP.classList.add('text-gray-600', 'bg-gray-100');
            walletAddressP.classList.remove('text-blue-700', 'bg-blue-50');
        }
    }

    function handleInvite() {
        if (!userId) return tg.showAlert('Не вдалося отримати ваш ID для запрошення.');
        // ВАЖЛИВО: Замініть 'your_bot_name_here' на реальне ім'я вашого бота
        const botUsername = 'your_bot_name_here';
        const link = `https://t.me/${botUsername}?start=ref_${userId}`;
        tg.switchInlineQuery(`Привіт! Приєднуйся до гри WeeClick та заробляй!\n\n${link}`, []);
    }

    /**
     * БЕЗПЕЧНЕ завантаження та відображення таблиці лідерів.
     * @param {string} type - Тип таблиці ('all-time' або 'monthly').
     */
    async function loadLeaderboard(type = 'all-time') {
        leaderboardList.innerHTML = `<div id="loader-spinner" class="text-center p-10"><i class="fas fa-spinner fa-spin fa-3x text-gray-400"></i></div>`;
        const field = type === 'monthly' ? 'monthlyScore' : 'score';
        const q = query(collection(db, "players"), orderBy(field, "desc"), limit(100));

        try {
            const querySnapshot = await getDocs(q);
            leaderboardList.innerHTML = '';
            let rank = 1;
            querySnapshot.forEach(doc => {
                const player = doc.data();
                const scoreToShow = player[field] || 0;

                // Створюємо елементи програмно, щоб уникнути XSS-вразливостей
                const playerElement = document.createElement('div');
                playerElement.className = 'flex items-center bg-white p-3 rounded-xl shadow-sm';

                const rankSpan = document.createElement('span');
                rankSpan.className = 'font-bold text-lg w-10 text-gray-500';
                rankSpan.textContent = rank.toString();

                const avatarImg = document.createElement('img');
                avatarImg.className = 'w-10 h-10 rounded-full mr-3 border-2 border-gray-200';
                avatarImg.src = player.photo_url || 'https://placehold.co/128x128/E0E0E0/BDBDBD?text=?';
                avatarImg.alt = 'Avatar';
                
                const infoDiv = document.createElement('div');
                infoDiv.className = 'flex-grow';
                
                const nameP = document.createElement('p');
                nameP.className = 'font-bold truncate';
                nameP.textContent = player.firstName || 'Player'; // Безпечна вставка імені

                const scoreP = document.createElement('p');
                scoreP.className = 'text-sm text-gray-500';
                scoreP.textContent = scoreToShow.toLocaleString('uk-UA'); // Безпечна вставка рахунку

                infoDiv.append(nameP, scoreP);
                playerElement.append(rankSpan, avatarImg, infoDiv);
                leaderboardList.appendChild(playerElement);
                
                rank++;
            });
        } catch (error) {
            console.error("Помилка завантаження лідерів:", error);
            leaderboardList.innerHTML = '<p class="text-center text-red-500">Не вдалося завантажити таблицю лідерів.</p>';
        }
    }

    function updateSeasonTimer() {
        const now = new Date();
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // Кінець поточного місяця
        const diff = end - now;

        if (diff < 0) {
            seasonTimer.textContent = "Сезон завершено!";
            return;
        }

        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        seasonTimer.textContent = `${d}д ${h}г ${m}хв ${s}с`;
    }

    // ---- Запуск ----
    initializeApp();
});