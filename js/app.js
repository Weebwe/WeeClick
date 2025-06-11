// Імпортуємо нашу базу даних та необхідні функції Firestore
import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

    // --- Ініціалізація Telegram ---
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
    const progressBar = document.getElementById('progress-bar');
    const botBlockScreen = document.getElementById('bot-block-screen');
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
    const tasksContainer = document.querySelector('#tasks-page .p-4');
    const allTaskCards = document.querySelectorAll('.task-card');

    // --- Ігровий стан ---
    let score = 0;
    let score2 = 10;
    let lives = 3;
    let completedTasks = [];
    let isMusicEnabled = true;
    let areEffectsEnabled = true;
    let playerDocRef; // Посилання на документ гравця в базі даних

    let isMusicUnmuted = false; 

    const clickSound = new Audio('sounds/click.mp3');
    const backgroundMusic = new Audio('sounds/background.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3;

    // --- Основна логіка ---
    
    async function initializeApp() {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            console.error("Не вдалося ідентифікувати користувача Telegram.");
            document.body.innerHTML = "Помилка ідентифікації. Будь ласка, перезапустіть гру.";
            return;
        }

        const userId = user.id.toString();
        playerDocRef = doc(db, "players", userId);

        try {
            const docSnap = await getDoc(playerDocRef);

            if (docSnap.exists()) {
                console.log("Завантаження даних існуючого гравця...");
                const data = docSnap.data();
                score = data.score ?? 0;
                score2 = data.score2 ?? 10;
                lives = data.lives ?? 3;
                completedTasks = data.completedTasks ?? [];
                isMusicEnabled = data.settings?.isMusicEnabled ?? true;
                areEffectsEnabled = data.settings?.areEffectsEnabled ?? true;
                
                completedTasks.forEach(taskId => updateTaskView(taskId, false));
                
            } else {
                console.log("Створення нового гравця...");
                const initialData = {
                    score: 0, score2: 10, lives: 3, completedTasks: [],
                    firstName: user.first_name || "Guest",
                    username: user.username || "unknown",
                    createdAt: serverTimestamp(),
                    settings: { isMusicEnabled: true, areEffectsEnabled: true }
                };
                await setDoc(playerDocRef, initialData);
            }
        } catch (error) {
            console.error("Помилка роботи з Firestore:", error);
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

    async function saveProgress(dataToSave) {
        if (!playerDocRef) return;
        try {
            await updateDoc(playerDocRef, dataToSave);
            console.log("Прогрес збережено:", dataToSave);
        } catch (error) {
            console.error("Помилка збереження прогресу:", error);
        }
    }
    
    function startLoadingSimulation() {
        if (isMusicEnabled) {
            backgroundMusic.muted = true;
            backgroundMusic.play().catch(e => console.error("Autoplay muted failed:", e));
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
    
    function populateProfileData(user) {
        if (!user) return;
        userName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Guest';
        userUsername.textContent = user.username ? `@${user.username}` : 'Нікнейм не вказано';
        if (user.photo_url) userPhoto.src = user.photo_url;
    }

    function setupEventListeners() {
        clickerButton.addEventListener('click', (event) => {
            if (isMusicEnabled && !isMusicUnmuted) {
                backgroundMusic.muted = false;
                isMusicUnmuted = true;
            }
            score++;
            updateAllStatsUI();
            animateClick(event);
            
            if (score % 20 === 0) {
                saveProgress({ score: score });
            }
        });
        
        allTaskCards.forEach(card => {
            const button = card.querySelector('.task-button, .bg-\\[\\#0094FE\\]');
            if (button) {
                button.addEventListener('click', () => handleTaskCompletion(card));
            }
        });
        
        toggleMusicBtn.addEventListener('click', toggleMusic);
        toggleEffectsBtn.addEventListener('click', toggleEffects);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                saveProgress({ score, score2, lives });
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
        
        tonConnectUI.onStatusChange(updateWalletUI);
    }

    function toggleMusic() {
        isMusicEnabled = !isMusicEnabled;
        updateSettingsUI();
        saveProgress({ 'settings.isMusicEnabled': isMusicEnabled });
        
        if (isMusicEnabled) {
            backgroundMusic.play().catch(e => console.error("Could not play music:", e));
        } else {
            backgroundMusic.pause();
        }
    }

    function toggleEffects() {
        areEffectsEnabled = !areEffectsEnabled;
        updateSettingsUI();
        saveProgress({ 'settings.areEffectsEnabled': areEffectsEnabled });
    }

    function updateSettingsUI() {
        if(!toggleMusicBtn || !toggleEffectsBtn) return;

        const musicIcon = toggleMusicBtn.querySelector('i');
        if (isMusicEnabled) {
            toggleMusicBtn.classList.add('active');
            musicIcon.className = 'fas fa-volume-up';
        } else {
            toggleMusicBtn.classList.remove('active');
            musicIcon.className = 'fas fa-volume-mute';
        }
        
        const effectsIcon = toggleEffectsBtn.querySelector('i');
        if (areEffectsEnabled) {
            toggleEffectsBtn.classList.add('active');
            effectsIcon.className = 'fas fa-star';
        } else {
            toggleEffectsBtn.classList.remove('active');
            effectsIcon.className = 'fas fa-star-half-alt';
        }
    }

    function updateAllStatsUI() {
        const formattedScore = score.toLocaleString('uk-UA');
        const formattedScore2 = score2.toLocaleString('uk-UA');

        scoreDisplay.textContent = formattedScore;
        score2Display.textContent = formattedScore2;
        livesDisplay.textContent = lives;
        
        if (profileScoreDisplay) profileScoreDisplay.textContent = formattedScore;
        if (profileScore2Display) profileScore2Display.textContent = formattedScore2;
    }

    function animateClick(e) {
        if (areEffectsEnabled) {
            clickSound.currentTime = 0;
            clickSound.play().catch(e => console.error("Не вдалося відтворити звук кліку:", e));
        }
        
        const animation = document.createElement('span');
        animation.className = 'click-animation';
        animation.textContent = '+1';
        const rect = clickerContainer.getBoundingClientRect();
        const x = e.clientX - rect.left - 15;
        const y = e.clientY - rect.top - 30;
        animation.style.left = `${x}px`;
        animation.style.top = `${y}px`;
        clickerContainer.appendChild(animation);
        setTimeout(() => animation.remove(), 1000);
    }

    function updateTaskView(taskId, shouldMove = true) {
        const taskCard = document.getElementById(taskId);
        if (taskCard) {
            taskCard.classList.add('completed');
            const button = taskCard.querySelector('.task-button, .bg-\\[\\#0094FE\\]');
            if(button) {
                button.disabled = true;
                button.textContent = 'Виконано';
            }
            const joinButton = taskCard.querySelector('.task-button-secondary');
            if (joinButton) {
                joinButton.style.pointerEvents = 'none';
            }
            if (tasksContainer && shouldMove) {
                tasksContainer.appendChild(taskCard);
            }
        }
    }

    function handleTaskCompletion(taskCard) {
        if (!taskCard || taskCard.classList.contains('completed')) return;

        const reward = parseInt(taskCard.dataset.reward || '0');
        score += reward;
        completedTasks.push(taskCard.id);
        
        updateAllStatsUI();
        updateTaskView(taskCard.id, true);
        
        tg.showAlert(`Нагороду в ${reward.toLocaleString('uk-UA')} монет зараховано!`);
        
        saveProgress({
            score: score,
            completedTasks: completedTasks
        });
    }
    
    function showPage(pageId) {
        pages.forEach(page => {
            if (page.id === pageId) {
                page.classList.add('page-active');
            } else {
                page.classList.remove('page-active');
            }
        });
    }

    function updateActiveNavItem(activeItem) {
        navItems.forEach(item => {
            item.classList.remove('active');
        });
        activeItem.classList.add('active');
    }

    function showProfileModal() {
        updateAllStatsUI();
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
            const friendlyAddress = TON_CONNECT_UI.toUserFriendlyAddress(wallet.account.address, wallet.account.chain === '-3');
            walletAddressP.textContent = friendlyAddress;
            walletAddressP.classList.remove('text-gray-600', 'bg-gray-100');
            walletAddressP.classList.add('text-blue-700', 'bg-blue-50');
        } else {
            walletAddressP.textContent = 'Гаманець не підключено';
            walletAddressP.classList.remove('text-blue-700', 'bg-blue-50');
            walletAddressP.classList.add('text-gray-600', 'bg-gray-100');
        }
    }
    
    // Запускаємо додаток
    initializeApp();
});
