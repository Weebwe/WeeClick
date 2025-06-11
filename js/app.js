// --- Ініціалізація ... (без змін)
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://weebwe.github.io/WeeClick/manifest.json',
    buttonRootId: 'ton-connect-header'
});

// --- Елементи DOM ---
// ... (всі попередні елементи без змін)
const userPremium = document.getElementById('user-premium');
const walletAddressP = document.getElementById('wallet-address');
// <--- ДОДАНО: Кнопка для перевірки завдання ---
const verifyGroupTaskBtn = document.getElementById('verify-group-task');

// --- Ігровий стан та звуки ... (без змін)
let score = 0;
let score2 = 10;
let lives = 3;
let isMusicPlaying = false; 
const clickSound = new Audio('sounds/click.mp3');
const backgroundMusic = new Audio('sounds/background.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 0.3;

// --- Функції ... ---

// ... (initializeApp, populateProfileData та інші функції до setupEventListeners без змін)
function initializeApp() { const user = tg.initDataUnsafe?.user; document.getElementById('copyright-year').textContent = new Date().getFullYear(); if (user?.is_bot) { loaderScreen.style.display = 'none'; botBlockScreen.classList.remove('hidden'); botBlockScreen.classList.add('flex'); return; } populateProfileData(user); updateWalletUI(tonConnectUI.wallet); updateStats(); setupEventListeners(); startLoadingSimulation(); }
function populateProfileData(user) { if (user) { userName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim(); userUsername.textContent = user.username ? `@${user.username}` : 'Нікнейм не вказано'; userId.textContent = user.id; if (user.photo_url) userPhoto.src = user.photo_url; userPremium.innerHTML = user.is_premium ? `<span class="premium-badge text-white text-xs font-bold px-2 py-1 rounded-full">Premium</span>` : 'Стандарт'; } else { userName.textContent = "WeeClick User"; userUsername.textContent = "@testuser"; userId.textContent = "123456789"; userPremium.textContent = "Стандарт"; } }
function startLoadingSimulation() { let progress = 0; const interval = setInterval(() => { progress += 1; if(progressBar) progressBar.style.width = progress + '%'; if (progress >= 100) { clearInterval(interval); loaderScreen.style.opacity = '0'; mainApp.classList.remove('hidden'); mainApp.classList.add('flex'); setTimeout(() => { const initialActiveItem = document.querySelector('.nav-item.active'); if (initialActiveItem) { updateNavIndicator(initialActiveItem); } loaderScreen.style.display = 'none'; }, 500); } }, 25); }


function setupEventListeners() {
    // ... (слухач для clickerButton без змін)
    clickerButton.addEventListener('click', (event) => { if (!isMusicPlaying) { backgroundMusic.play().catch(e => console.error("Не вдалося відтворити фонову музику:", e)); isMusicPlaying = true; } score++; updateStats(); animateClick(event); });

    // <--- ДОДАНО: Слухач для кнопки перевірки підписки ---
    verifyGroupTaskBtn.addEventListener('click', handleGroupVerification);

    // ... (решта слухачів без змін)
    navItems.forEach(item => { item.addEventListener('click', () => { showPage(item.dataset.page); updateActiveNavItem(item); updateNavIndicator(item); }); });
    profileBtn.addEventListener('click', showProfileModal);
    closeProfileBtn.addEventListener('click', hideProfileModal);
    profileModalBackdrop.addEventListener('click', hideProfileModal);
    tonConnectUI.onStatusChange(updateWalletUI);
    window.addEventListener('resize', () => { const activeItem = document.querySelector('.nav-item.active'); if (activeItem) { updateNavIndicator(activeItem); } });
}

// <--- ДОДАНО: Функція для обробки завдання підписки ---
function handleGroupVerification() {
    // Це клієнтська симуляція. Реальна перевірка вимагає бек-енду.
    // Ми просто даємо нагороду і блокуємо кнопку.
    
    // Нараховуємо бали
    score += 1500;
    updateStats();

    // Показуємо користувачу, що завдання виконано
    tg.showAlert('Нагороду в 1,500 монет зараховано!');

    // Блокуємо кнопку, щоб уникнути повторного натискання
    verifyGroupTaskBtn.disabled = true;
    verifyGroupTaskBtn.textContent = 'Виконано';
    // Також можна заблокувати кнопку "Приєднатись"
    verifyGroupTaskBtn.previousElementSibling.style.pointerEvents = 'none';
    verifyGroupTaskBtn.previousElementSibling.style.opacity = '0.5';
}

// ... (всі решта функцій: updateStats, animateClick, etc. - без змін)
function updateStats() { scoreDisplay.textContent = score.toLocaleString('uk-UA'); score2Display.textContent = score2.toLocaleString('uk-UA'); livesDisplay.textContent = lives; }
function animateClick(e) { clickSound.currentTime = 0; clickSound.play().catch(e => console.error("Не вдалося відтворити звук кліку:", e)); const animation = document.createElement('span'); animation.className = 'click-animation'; animation.textContent = '+1'; const rect = clickerContainer.getBoundingClientRect(); const x = e.clientX - rect.left - 15; const y = e.clientY - rect.top - 30; animation.style.left = `${x}px`; animation.style.top = `${y}px`; clickerContainer.appendChild(animation); setTimeout(() => animation.remove(), 1000); }
function showPage(pageId) { pages.forEach(page => page.classList.add('hidden')); document.getElementById(pageId)?.classList.remove('hidden'); }
function updateActiveNavItem(activeItem) { navItems.forEach(item => item.classList.remove('active')); activeItem.classList.add('active'); }
function updateNavIndicator(activeItem) { if (activeItem) { const itemRect = activeItem.getBoundingClientRect(); const navRect = activeItem.parentElement.getBoundingClientRect(); const centerPosition = itemRect.left - navRect.left + itemRect.width / 2; const newPosition = centerPosition - navIndicator.offsetWidth / 2; navIndicator.style.transform = `translateX(${newPosition}px)`; } }
function showProfileModal() { profileModal.classList.remove('hidden'); setTimeout(() => { profileModalBackdrop.classList.remove('opacity-0'); profileModalContent.classList.remove('scale-95', 'opacity-0'); }, 10); }
function hideProfileModal() { profileModalBackdrop.classList.add('opacity-0'); profileModalContent.classList.add('scale-95', 'opacity-0'); setTimeout(() => profileModal.classList.add('hidden'), 300); }
function updateWalletUI(wallet) { if (wallet) { const friendlyAddress = TON_CONNECT_UI.toUserFriendlyAddress(wallet.account.address, wallet.account.chain === '-3'); walletAddressP.textContent = friendlyAddress; walletAddressP.classList.remove('text-gray-600', 'bg-gray-100'); walletAddressP.classList.add('text-blue-700', 'bg-blue-50'); } else { walletAddressP.textContent = 'Гаманець не підключено'; walletAddressP.classList.remove('text-blue-700', 'bg-blue-50'); walletAddressP.classList.add('text-gray-600', 'bg-gray-100'); } }


window.addEventListener('load', initializeApp);
