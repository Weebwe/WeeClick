// Цей код запускається, коли вся структура сторінки (HTML) готова до роботи.
document.addEventListener('DOMContentLoaded', () => {

    // --- Ініціалізація Telegram та TON Connect ---
    // Перевіряємо, чи існують об'єкти, перш ніж їх використовувати
    const tg = window.Telegram?.WebApp;
    const TON_CONNECT_UI = window.TON_CONNECT_UI;

    if (!tg || !TON_CONNECT_UI) {
        console.error("Telegram або TON Connect UI скрипти не завантажились!");
        // Можна показати повідомлення про помилку користувачу
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
    const navIndicator = document.getElementById('nav-indicator');
    const pages = document.querySelectorAll('.page');
    const profileBtn = document.getElementById('profile-btn');
    const profileModal = document.getElementById('profile-modal');
    const profileModalBackdrop = document.getElementById('profile-modal-backdrop');
    const profileModalContent = document.getElementById('profile-modal-content');
    const closeProfileBtn = document.getElementById('close-profile-btn');
    const userPhoto = document.getElementById('user-photo');
    const userName = document.getElementById('user-name');
    const userUsername = document.getElementById('user-username');
    const userId = document.getElementById('user-id');
    const userPremium = document.getElementById('user-premium');
    const walletAddressP = document.getElementById('wallet-address');
    const verifyGroupTaskBtn = document.getElementById('verify-group-task');

    // --- Ігровий стан та звуки ---
    let score = 0;
    let score2 = 10;
    let lives = 3;
    let isMusicPlaying = false; 

    // ВАЖЛИВО: Переконайтесь, що файли `click.mp3` та `background.mp3` існують у папці `sounds`
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
        updateStats();
        setupEventListeners();
        startLoadingSimulation();
    }

    function startLoadingSimulation() {
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
                // Затримка потрібна, щоб елементи встигли відобразитись перед розрахунком позиції індикатора
                setTimeout(() => {
                    const initialActiveItem = document.querySelector('.nav-item.active');
                    if (initialActiveItem) updateNavIndicator(initialActiveItem);
                    if (loaderScreen) loaderScreen.style.display = 'none';
                }, 500);
            }
        }, 25);
    }

    function populateProfileData(user) {
        if (!user) return;
        userName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Guest';
        userUsername.textContent = user.username ? `@${user.username}` : 'Нікнейм не вказано';
        userId.textContent = user.id;
        if (user.photo_url) userPhoto.src = user.photo_url;
        userPremium.innerHTML = user.is_premium ? `<span class="premium-badge text-white text-xs font-bold px-2 py-1 rounded-full">Premium</span>` : 'Стандарт';
    }

    function setupEventListeners() {
        clickerButton.addEventListener('click', (event) => {
            if (!isMusicPlaying) {
                backgroundMusic.play().catch(e => console.error("Не вдалося відтворити фонову музику:", e));
                isMusicPlaying = true;
            }
            score++;
            updateStats();
            animateClick(event);
        });

        verifyGroupTaskBtn.addEventListener('click', handleGroupVerification);

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                showPage(item.dataset.page);
                updateActiveNavItem(item);
                updateNavIndicator(item);
            });
        });

        profileBtn.addEventListener('click', showProfileModal);
        closeProfileBtn.addEventListener('click', hideProfileModal);
        profileModalBackdrop.addEventListener('click', hideProfileModal);
        tonConnectUI.onStatusChange(updateWalletUI);
        window.addEventListener('resize', () => {
            const activeItem = document.querySelector('.nav-item.active');
            if (activeItem) updateNavIndicator(activeItem);
        });
    }

    function handleGroupVerification() {
        score += 1500;
        updateStats();
        tg.showAlert('Нагороду в 1,500 монет зараховано!');
        verifyGroupTaskBtn.disabled = true;
        verifyGroupTaskBtn.textContent = 'Виконано';
        const joinButton = verifyGroupTaskBtn.previousElementSibling;
        if(joinButton) {
            joinButton.style.pointerEvents = 'none';
            joinButton.style.opacity = '0.5';
        }
    }
    
    function updateStats() {
        scoreDisplay.textContent = score.toLocaleString('uk-UA');
        score2Display.textContent = score2.toLocaleString('uk-UA');
        livesDisplay.textContent = lives;
    }

    function animateClick(e) {
        clickSound.currentTime = 0;
        clickSound.play().catch(e => console.error("Не вдалося відтворити звук кліку:", e));
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

    function showPage(pageId) {
        pages.forEach(page => page.classList.add('hidden'));
        document.getElementById(pageId)?.classList.remove('hidden');
    }

    function updateActiveNavItem(activeItem) {
        navItems.forEach(item => item.classList.remove('active'));
        activeItem.classList.add('active');
    }

    function updateNavIndicator(activeItem) {
        if (!activeItem || !navIndicator) return;
        const navRect = activeItem.parentElement.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        const centerPosition = itemRect.left - navRect.left + itemRect.width / 2;
        const newPosition = centerPosition - navIndicator.offsetWidth / 2;
        navIndicator.style.transform = `translateX(${newPosition}px)`;
    }

    function showProfileModal() {
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
