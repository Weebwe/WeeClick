document.addEventListener('DOMContentLoaded', () => {

    // --- Ініціалізація Telegram та TON Connect ---
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
    const tasksContainer = document.getElementById('tasks-page');
    const verifyGroupTaskBtn = document.getElementById('verify-group-task');

    // --- Ігровий стан, налаштування та звуки ---
    let score = 0;
    let score2 = 10;
    let lives = 3;
    
    let isMusicEnabled = JSON.parse(localStorage.getItem('isMusicEnabled')) ?? true;
    let areEffectsEnabled = JSON.parse(localStorage.getItem('areEffectsEnabled')) ?? true;
    
    let isMusicUnmuted = false; 

    const clickSound = new Audio('sounds/click.mp3');
    const backgroundMusic = new Audio('sounds/background.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3;

    // --- Основна логіка ---
    
    function initializeApp() {
        const user = tg.initDataUnsafe?.user;
        document.getElementById('copyright-year').textContent = new Date().getFullYear();

        if (user?.is_bot) {
            loaderScreen.style.display = 'none';
            botBlockScreen.classList.remove('hidden');
            botBlockScreen.classList.add('flex');
            return;
        }

        populateProfileData(user);
        updateWalletUI(tonConnectUI.wallet);
        updateAllStatsUI();
        updateSettingsUI();
        setupEventListeners();
        startLoadingSimulation();
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
        });
        
        verifyGroupTaskBtn.addEventListener('click', handleGroupVerification);
        
        toggleMusicBtn.addEventListener('click', toggleMusic);
        toggleEffectsBtn.addEventListener('click', toggleEffects);

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
        localStorage.setItem('isMusicEnabled', JSON.stringify(isMusicEnabled));
        
        if (isMusicEnabled) {
            backgroundMusic.play().catch(e => console.error("Could not play music:", e));
        } else {
            backgroundMusic.pause();
        }
        updateSettingsUI();
    }

    function toggleEffects() {
        areEffectsEnabled = !areEffectsEnabled;
        localStorage.setItem('areEffectsEnabled', JSON.stringify(areEffectsEnabled));
        updateSettingsUI();
    }

    function updateSettingsUI() {
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
    
    function handleGroupVerification(event) {
        const button = event.currentTarget;
        const taskCard = button.closest('.task-card');

        if (!taskCard || taskCard.classList.contains('completed')) return;

        score += 1500;
        updateAllStatsUI();
        tg.showAlert('Нагороду в 1,500 монет зараховано!');
        
        taskCard.classList.add('completed');
        button.disabled = true;
        button.textContent = 'Виконано';
        const joinButton = button.previousElementSibling;
        if (joinButton) {
            joinButton.style.pointerEvents = 'none';
        }
        
        tasksContainer.appendChild(taskCard);
    }
    
    function showPage(pageId) {
        pages.forEach(page => page.classList.add('hidden'));
        document.getElementById(pageId)?.classList.remove('hidden');
    }

    function updateActiveNavItem(activeItem) {
        navItems.forEach(item => item.classList.remove('active'));
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
    
    initializeApp();
});
