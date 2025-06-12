// Імпортуємо нашу базу даних та необхідні функції Firestore
import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

    // --- Ініціалізація Telegram та TON ---
    const tg = window.Telegram?.WebApp;
    const TON_CONNECT_UI = window.TON_CONNECT_UI;

    if (!tg || !TON_CONNECT_UI) {
        console.error("Telegram або TON Connect UI скрипти не завантажились!");
        document.body.innerHTML = 'Помилка завантаження. Спробуйте оновити сторінку.';
        return;
    }

    tg.ready();
    tg.expand();

    const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: 'https://weebwe.github.io/WeeClick/manifest.json', // Замініть на ваш URL маніфесту
        buttonRootId: 'ton-connect-header'
    });

    // --- Пошук всіх необхідних елементів на сторінці ---
    const loaderScreen = document.getElementById('loader-screen');
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
    const allTaskCards = document.querySelectorAll('.task-card');

    // --- Ігровий стан ---
    let score = 0, score2 = 10, lives = 3;
    let completedTasks = [];
    let isMusicEnabled = true, areEffectsEnabled = true;
    let playerDocRef; 

    const clickSound = new Audio('sounds/click.mp3');
    const backgroundMusic = new Audio('sounds/background.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3;

    // --- Основна логіка ---
    
    async function initializeApp() {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            document.body.innerHTML = "Помилка ідентифікації. Будь ласка, перезапустіть гру.";
            return;
        }

        const userId = user.id.toString();
        playerDocRef = doc(db, "players", userId);

        try {
            const docSnap = await getDoc(playerDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                score = data.score ?? 0;
                score2 = data.score2 ?? 10;
                lives = data.lives ?? 3;
                completedTasks = data.completedTasks ?? [];
                isMusicEnabled = data.settings?.isMusicEnabled ?? true;
                areEffectsEnabled = data.settings?.areEffectsEnabled ?? true;
            } else {
                await setDoc(playerDocRef, {
                    score: 0, score2: 10, lives: 3, completedTasks: [],
                    firstName: user.first_name || "Guest", username: user.username || "unknown",
                    createdAt: serverTimestamp(),
                    settings: { isMusicEnabled: true, areEffectsEnabled: true }
                });
            }
        } catch (error) {
            console.error("Помилка роботи з Firestore:", error);
            tg.showAlert("Не вдалося завантажити профіль. Перевірте з'єднання.");
            return;
        }

        completedTasks.forEach(taskId => updateTaskView(taskId, false));
        populateProfileData(user);
        updateAllStatsUI();
        updateSettingsUI();
        setupEventListeners();
        showPage('home-page');
        finishLoading();
    }
    
    // Функція для плавного збереження даних (Debounce)
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    const debouncedSave = debounce(() => {
        if (!playerDocRef) return;
        updateDoc(playerDocRef, { score, score2, lives })
            .catch(e => console.error("Помилка збереження прогресу:", e));
    }, 2000);

    function finishLoading() {
        // Симулюємо мінімальний час завантаження для показу анімації
        setTimeout(() => {
            loaderScreen.style.opacity = '0';
            mainApp.classList.remove('hidden');
            mainApp.classList.add('flex');
            setTimeout(() => loaderScreen.style.display = 'none', 500);
        }, 1500); 
    }
    
    function populateProfileData(user) {
        if (!user) return;
        userName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Guest';
        userUsername.textContent = user.username ? `@${user.username}` : 'Нікнейм не вказано';
        if (user.photo_url) userPhoto.src = user.photo_url;
    }

    function setupEventListeners() {
        clickerButton.addEventListener('click', (event) => {
            score++;
            updateAllStatsUI();
            animateClick(event);
            debouncedSave();
        });
        
        allTaskCards.forEach(card => {
            const button = card.querySelector('.task-button');
            if (button) button.addEventListener('click', () => handleTaskCompletion(card));
        });
        
        toggleMusicBtn.addEventListener('click', toggleMusic);
        toggleEffectsBtn.addEventListener('click', toggleEffects);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                if (!playerDocRef) return;
                updateDoc(playerDocRef, { score, score2, lives });
            }
        });

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                showPage(item.dataset.page);
                updateActiveNavItem(item);
            });
        });

        profileBtn.addEventListener('click', showProfileModal);
        closeProfileBtn.addEventListener('click', hideProfileModal);
        profileModalBackdrop.addEventListener('click', hideProfileModal);
        
        tonConnectUI.onStatusChange(wallet => updateWalletUI(wallet));
    }

    // ВИПРАВЛЕНА функція
    function showProfileModal() {
        updateAllStatsUI();
        // Примусово оновлюємо UI гаманця щоразу при відкритті профілю
        updateWalletUI(tonConnectUI.wallet); 
    
        profileModal.classList.remove('hidden');
        setTimeout(() => {
            profileModalBackdrop.classList.remove('opacity-0');
            profileModalContent.classList.remove('scale-95', 'opacity-0');
        }, 10);
    }
    
    // НОВА функція анімації кліку
    function animateClick(e) {
        if (areEffectsEnabled) {
            clickSound.currentTime = 0;
            clickSound.play().catch(err => console.error("Не вдалося відтворити звук кліку:", err));
        }
    
        const valueText = document.createElement('div');
        valueText.className = 'click-value-text';
        valueText.textContent = '+1';
        clickerContainer.appendChild(valueText);
        setTimeout(() => valueText.remove(), 1000);
    
        const rect = clickerContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
    
        for (let i = 0; i < 10; i++) {
            const particle = document.createElement('div');
            particle.className = 'click-particle';
            clickerContainer.appendChild(particle);
    
            const size = Math.random() * 8 + 4;
            const angle = Math.random() * 360;
            const distance = Math.random() * 80 + 50;
    
            const offsetX = Math.cos(angle * (Math.PI / 180)) * distance;
            const offsetY = Math.sin(angle * (Math.PI / 180)) * distance;
    
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
    
            particle.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${offsetX}px, ${offsetY}px) scale(0)`, opacity: 1 }
            ], {
                duration: 700 + Math.random() * 300,
                easing: 'cubic-bezier(0.1, 0.9, 0.2, 1)',
                fill: 'forwards'
            });
    
            setTimeout(() => particle.remove(), 1000);
        }
    }

    function handleTaskCompletion(taskCard) {
        // !!! УВАГА: КРИТИЧНО ВАЖЛИВО !!!
        // Ця функція НЕБЕЗПЕЧНА для реального використання. 
        // Користувач може легко її викликати і нарахувати собі монети.
        // Перевірка завдань МАЄ відбуватися на сервері (наприклад, Firebase Cloud Functions).
        // Цей код є лише ЗАГЛУШКОЮ для тестування інтерфейсу.
        
        if (!taskCard || taskCard.classList.contains('completed')) return;

        const reward = parseInt(taskCard.dataset.reward || '0');
        const taskId = taskCard.id;

        score += reward;
        completedTasks.push(taskId);
        
        updateAllStatsUI();
        updateTaskView(taskId, true);
        
        tg.showAlert(`Нагороду в ${reward.toLocaleString('uk-UA')} монет зараховано! (Демо)`);
        
        if(playerDocRef) {
            updateDoc(playerDocRef, {
                score: score,
                completedTasks: completedTasks
            });
        }
    }

    // --- Інші функції (UI, навігація і т.д.) ---

    function toggleMusic() {
        isMusicEnabled = !isMusicEnabled;
        updateSettingsUI();
        if(playerDocRef) updateDoc(playerDocRef, { 'settings.isMusicEnabled': isMusicEnabled });
        isMusicEnabled ? backgroundMusic.play().catch(e => {}) : backgroundMusic.pause();
    }
    function toggleEffects() {
        areEffectsEnabled = !areEffectsEnabled;
        updateSettingsUI();
        if(playerDocRef) updateDoc(playerDocRef, { 'settings.areEffectsEnabled': areEffectsEnabled });
    }
    function updateSettingsUI() {
        const musicIcon = toggleMusicBtn.querySelector('.action i');
        isMusicEnabled ? musicIcon.className = 'fas fa-volume-up' : musicIcon.className = 'fas fa-volume-mute';
        const effectsIcon = toggleEffectsBtn.querySelector('.action i');
        areEffectsEnabled ? effectsIcon.className = 'fas fa-star' : effectsIcon.className = 'fas fa-star-half-alt';
    }
    function updateAllStatsUI() {
        scoreDisplay.textContent = score.toLocaleString('uk-UA');
        score2Display.textContent = score2.toLocaleString('uk-UA');
        livesDisplay.textContent = lives;
        if (profileScoreDisplay) profileScoreDisplay.textContent = score.toLocaleString('uk-UA');
        if (profileScore2Display) profileScore2Display.textContent = score2.toLocaleString('uk-UA');
    }
    function updateTaskView(taskId, shouldMove = true) {
        const taskCard = document.getElementById(taskId);
        if (taskCard) {
            taskCard.classList.add('completed');
            const button = taskCard.querySelector('.task-button');
            if(button) {
                button.disabled = true;
                button.textContent = 'Виконано';
            }
        }
    }
    function showPage(pageId) {
        pages.forEach(page => page.classList.toggle('page-active', page.id === pageId));
    }
    function updateActiveNavItem(activeItem) {
        navItems.forEach(item => item.classList.remove('active'));
        activeItem.classList.add('active');
    }
    function hideProfileModal() {
        profileModalBackdrop.classList.add('opacity-0');
        profileModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => profileModal.classList.add('hidden'), 300);
    }
    function updateWalletUI(wallet) {
        if (wallet) {
            const address = TON_CONNECT_UI.toUserFriendlyAddress(wallet.account.address);
            walletAddressP.textContent = address;
            walletAddressP.classList.add('text-blue-700', 'bg-blue-50');
        } else {
            walletAddressP.textContent = 'Гаманець не підключено';
            walletAddressP.classList.remove('text-blue-700', 'bg-blue-50');
        }
    }
    
    // Запускаємо додаток
    initializeApp();
});

