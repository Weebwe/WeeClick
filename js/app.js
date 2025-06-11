import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

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
        manifestUrl: 'https://weebwe.github.io/WeeClick/manifest.json',
        buttonRootId: 'ton-connect-header'
    });

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

    let score = 0;
    let score2 = 10;
    let lives = 3;
    let completedTasks = [];
    let isMusicEnabled = true;
    let areEffectsEnabled = true;
    let playerDocRef;

    let isMusicUnmuted = false;

    const clickSound = new Audio('sounds/click.mp3');
    const backgroundMusic = new Audio('sounds/background.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3;

    async function initializeApp() {
        startLoadingSimulation();

        const user = tg.initDataUnsafe?.user;
        if (!user) {
            console.error("Не вдалося ідентифікувати користувача Telegram.");
            loaderScreen.innerHTML = "Помилка ідентифікації. Перезапустіть гру.";
            return;
        }
        
        if (user.is_bot) {
            botBlockScreen.classList.remove('hidden');
            botBlockScreen.classList.add('flex');
            loaderScreen.style.display = 'none';
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
                completedTasks.forEach(taskId => updateTaskView(taskId, false));
            } else {
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
        }

        populateProfileData(user);
        updateAllStatsUI();
        updateSettingsUI();
        setupEventListeners();
        showPage('home-page');
        updateActiveNavItem(document.querySelector('.nav-item[data-page="home-page"]'));
    }

    async function saveProgress(dataToSave) {
        if (!playerDocRef) return;
        try {
            const dataWithTimestamp = { ...dataToSave, lastUpdated: serverTimestamp() };
            await updateDoc(playerDocRef, dataWithTimestamp);
            console.log("Прогрес збережено:", dataToSave);
        } catch (error) {
            console.error("Помилка збереження прогресу:", error);
        }
    }
    
    function startLoadingSimulation() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 2;
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
        }, 30);
    }
    
    function populateProfileData(user) {
        if (!user) return;
        userName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Guest';
        userUsername.textContent = user.username ? `@${user.username}` : 'Нікнейм не вказано';
        if (user.photo_url) {
            userPhoto.src = user.photo_url;
        } else {
            userPhoto.src = 'https://placehold.co/128x128/E0E0E0/BDBDBD?text=?';
        }
    }

    function setupEventListeners() {
        clickerButton.addEventListener('click', (event) => {
            if (isMusicEnabled && !isMusicUnmuted) {
                backgroundMusic.muted = false;
                backgroundMusic.play().catch(e => console.error("Could not play music on first click:", e));
                isMusicUnmuted = true;
            }
            score++;
            updateAllStatsUI();
            animateClick(event);
            if (score % 20 === 0) saveProgress({ score });
        });

        allTaskCards.forEach(card => {
            const button = card.querySelector('.task-button, .bg-\\[\\#0094FE\\]');
            if (button) button.addEventListener('click', () => handleTaskCompletion(card));
        });
        
        toggleMusicBtn.addEventListener('click', toggleMusic);
        toggleEffectsBtn.addEventListener('click', toggleEffects);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') saveProgress({ score, score2, lives });
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
            isMusicUnmuted = true;
            backgroundMusic.muted = false;
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
        const effectsIcon = toggleEffectsBtn.querySelector('i');
        
        if (isMusicEnabled) {
            toggleMusicBtn.classList.add('active');
            musicIcon.className = 'fas fa-volume-up';
        } else {
            toggleMusicBtn.classList.remove('active');
            musicIcon.className = 'fas fa-volume-mute';
        }
        
        if (areEffectsEnabled) {
            toggleEffectsBtn.classList.add('active');
            effectsIcon.className = 'fas fa-star';
        } else {
            toggleEffectsBtn.classList.remove('active');
            effectsIcon.className = 'fas fa-ban';
        }
    }

    function updateAllStatsUI() {
        if(scoreDisplay) scoreDisplay.textContent = score.toLocaleString('uk-UA');
        if(score2Display) score2Display.textContent = score2.toLocaleString('uk-UA');
        if(livesDisplay) livesDisplay.textContent = lives;
        if(profileScoreDisplay) profileScoreDisplay.textContent = score.toLocaleString('uk-UA');
        if(profileScore2Display) profileScore2Display.textContent = score2.toLocaleString('uk-UA');
    }

    function animateClick(e) {
        if (!areEffectsEnabled) return;
        clickSound.currentTime = 0;
        clickSound.play().catch(err => console.error("Sound effect error:", err));

        const plusOne = document.createElement('span');
        plusOne.textContent = '+1';
        plusOne.className = 'plus-one-animation';
        
        if(clickerContainer) {
            clickerContainer.appendChild(plusOne);
            const rect = clickerContainer.getBoundingClientRect();
            plusOne.style.left = `${e.clientX - rect.left}px`;
            plusOne.style.top = `${e.clientY - rect.top}px`;
            setTimeout(() => plusOne.remove(), 1000);
        }
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
                joinButton.classList.add('disabled');
            }
            if (tasksContainer && shouldMove) tasksContainer.appendChild(taskCard);
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
        saveProgress({ score, completedTasks });
    }
    
    function showPage(pageId) {
        pages.forEach(page => {
            page.classList.toggle('active', page.id === pageId);
        });
    }

    function updateActiveNavItem(activeItem) {
        navItems.forEach(item => item.classList.remove('active'));
        if (activeItem) activeItem.classList.add('active');
    }

    function showProfileModal() {
        updateAllStatsUI();
        updateWalletUI(tonConnectUI.wallet);
        profileModal.classList.remove('hidden');
        setTimeout(() => {
            profileModal.classList.add('active');
            if(profileModalContent) profileModalContent.classList.add('active');
        }, 10);
    }

    function hideProfileModal() {
        if(profileModalContent) profileModalContent.classList.remove('active');
        profileModal.classList.remove('active');
        setTimeout(() => profileModal.classList.add('hidden'), 300);
    }

    function updateWalletUI(wallet) {
        if (wallet) {
            const friendlyAddress = TON_CONNECT_UI.toUserFriendlyAddress(wallet.account.address, wallet.account.chain === -3);
            if(walletAddressP) {
                walletAddressP.textContent = friendlyAddress;
                walletAddressP.classList.add('active');
            }
        } else {
            if(walletAddressP) {
                walletAddressP.textContent = 'Гаманець не підключено';
                walletAddressP.classList.remove('active');
            }
        }
    }
    
    initializeApp();
});
