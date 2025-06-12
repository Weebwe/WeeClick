import { db, functions } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, where, addDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js";

document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram?.WebApp;
    const TON_CONNECT_UI = window.TON_CONNECT_UI;

    if (!tg || !TON_CONNECT_UI) {
        console.error("Scripts not loaded!");
        document.body.innerHTML = 'Error loading. Please refresh.';
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
    const allTaskCards = document.querySelectorAll('.task-card');
    const exchangeInput = document.getElementById('exchange-input');
    const exchangeBtn = document.getElementById('exchange-btn');
    const leaderboardTabs = document.querySelectorAll('.leaderboard-tab');
    const leaderboardList = document.getElementById('leaderboard-list');
    const monthlyLeaderboardInfo = document.getElementById('monthly-leaderboard-info');
    const seasonTimer = document.getElementById('season-timer');
    const goToCreateTaskBtn = document.getElementById('go-to-create-task-btn');
    const taskUrlInput = document.getElementById('task-url');
    const taskRewardInput = document.getElementById('task-reward');
    const taskGoalInput = document.getElementById('task-goal');
    const calcTotalSpan = document.getElementById('calc-total');
    const calcCommissionSpan = document.getElementById('calc-commission');
    const calcFinalSpan = document.getElementById('calc-final');
    const createTaskConfirmBtn = document.getElementById('create-task-confirm-btn');
    const customTasksContainer = document.getElementById('custom-tasks-container');

    let score = 0, score2 = 10, lives = 3, monthlyScore = 0;
    let completedTasks = [], isMusicEnabled = true, areEffectsEnabled = true;
    let playerDocRef, userId;
    let isMusicUnmuted = false; 

    const clickSound = new Audio('sounds/click.mp3');
    const backgroundMusic = new Audio('sounds/background.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3;

    async function initializeApp() {
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            console.error("User identification failed.");
            document.body.innerHTML = "Identification error. Please restart.";
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
                completedTasks.forEach(taskId => updateTaskView(taskId, false));
            } else {
                const initialData = {
                    score: 0, score2: 10, lives: 3, monthlyScore: 0, completedTasks: [],
                    firstName: user.first_name || "Guest", username: user.username || "unknown",
                    createdAt: serverTimestamp(),
                    settings: { isMusicEnabled: true, areEffectsEnabled: true },
                    referredBy: null
                };
                const startParam = tg.initDataUnsafe?.start_param;
                if (startParam && startParam.startsWith('ref_')) {
                    const referrerId = startParam.substring(4);
                    if (referrerId !== userId) {
                        initialData.referredBy = referrerId;
                    }
                }
                await setDoc(playerDocRef, initialData);
                Object.assign(this, initialData);
            }
        } catch (error) {
            console.error("Firestore Error:", error);
            tg.showAlert("Failed to load profile. Check your connection.");
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
        } catch (error) {
            console.error("Save Progress Error:", error);
        }
    }
    
    function startLoadingSimulation() {
        if (isMusicEnabled) {
            backgroundMusic.muted = true;
            backgroundMusic.play().catch(e => {});
        }
        let progress = 0;
        const interval = setInterval(() => {
            progress += 1;
            if (progressBar) progressBar.style.width = progress + '%';
            if (progress >= 100) {
                clearInterval(interval);
                if(loaderScreen) loaderScreen.style.opacity = '0';
                if(mainApp) {
                    mainApp.classList.remove('hidden');
                    mainApp.classList.add('flex');
                }
                setTimeout(() => { if(loaderScreen) loaderScreen.style.display = 'none'; }, 500);
            }
        }, 25);
    }
    
    function populateProfileData(user) {
        if (!user) return;
        userName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Guest';
        userUsername.textContent = user.username ? `@${user.username}` : 'No username';
        if (user.photo_url) userPhoto.src = user.photo_url;
    }

    function setupEventListeners() {
        clickerButton.addEventListener('click', (event) => {
            if (isMusicEnabled && !isMusicUnmuted) {
                backgroundMusic.muted = false;
                isMusicUnmuted = true;
            }
            score++;
            monthlyScore++;
            updateAllStatsUI();
            animateClick(event);
            if (score % 20 === 0) saveProgress({ score: score, monthlyScore: monthlyScore });
        });
        
        allTaskCards.forEach(card => {
            const button = card.querySelector('.js-task-action-btn');
            if (button) button.addEventListener('click', () => handleTaskCompletion(card));
        });
        
        toggleMusicBtn.addEventListener('click', toggleMusic);
        toggleEffectsBtn.addEventListener('click', toggleEffects);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveProgress({ score, score2, lives, monthlyScore }); });
        navItems.forEach(item => item.addEventListener('click', () => { showPage(item.dataset.page); updateActiveNavItem(item); }));
        profileBtn.addEventListener('click', showProfileModal);
        closeProfileBtn.addEventListener('click', hideProfileModal);
        profileModalBackdrop.addEventListener('click', hideProfileModal);
        tonConnectUI.onStatusChange(updateWalletUI);
        exchangeBtn.addEventListener('click', handleExchange);
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
        setInterval(() => { if (document.getElementById('leaders-page').classList.contains('page-active')) updateSeasonTimer(); }, 1000);
        
        goToCreateTaskBtn.addEventListener('click', () => showPage('create-task-page'));
        [taskRewardInput, taskGoalInput].forEach(input => input.addEventListener('input', calculateTaskCost));
        createTaskConfirmBtn.addEventListener('click', confirmAndCreateTask);
    }

    function toggleMusic() {
        isMusicEnabled = !isMusicEnabled;
        updateSettingsUI();
        saveProgress({ 'settings.isMusicEnabled': isMusicEnabled });
        isMusicEnabled ? backgroundMusic.play().catch(e => {}) : backgroundMusic.pause();
    }

    function toggleEffects() {
        areEffectsEnabled = !areEffectsEnabled;
        updateSettingsUI();
        saveProgress({ 'settings.areEffectsEnabled': areEffectsEnabled });
    }

    function updateSettingsUI() {
        if(!toggleMusicBtn || !toggleEffectsBtn) return;
        const musicIcon = toggleMusicBtn.querySelector('i'), effectsIcon = toggleEffectsBtn.querySelector('i');
        toggleMusicBtn.classList.toggle('active', isMusicEnabled);
        musicIcon.className = isMusicEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
        toggleEffectsBtn.classList.toggle('active', areEffectsEnabled);
        effectsIcon.className = areEffectsEnabled ? 'fas fa-star' : 'fas fa-star-half-alt';
    }

    function updateAllStatsUI() {
        const fScore = score.toLocaleString('uk-UA'), fScore2 = score2.toLocaleString('uk-UA');
        [scoreDisplay, profileScoreDisplay].forEach(el => el.textContent = fScore);
        [score2Display, profileScore2Display].forEach(el => el.textContent = fScore2);
        livesDisplay.textContent = lives;
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

    function updateTaskView(taskId, shouldMove = true) {
        const taskCard = document.getElementById(taskId);
        if (taskCard) {
            taskCard.classList.add('completed');
            const button = taskCard.querySelector('.task-button, .js-task-action-btn');
            if(button) {
                button.disabled = true;
                button.textContent = 'Виконано';
            }
            taskCard.querySelector('.task-button-secondary')?.style.setProperty('pointer-events', 'none');
            if (document.querySelector('#tasks-page .p-4') && shouldMove) document.querySelector('#tasks-page .p-4').appendChild(taskCard);
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
        saveProgress({ score: score, completedTasks: completedTasks });
    }
    
    function showPage(pageId) {
        pages.forEach(p => p.classList.toggle('page-active', p.id === pageId));
        if (pageId === 'leaders-page') {
            loadLeaderboard('all-time');
            monthlyLeaderboardInfo.classList.add('hidden');
            document.querySelector('.leaderboard-tab.active')?.classList.remove('active');
            document.querySelector('.leaderboard-tab[data-leaderboard="all-time"]').classList.add('active');
        }
        if (pageId === 'tasks-page') loadCustomTasks();
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

    function handleExchange() {
        const rate = 1000000, amount = parseInt(exchangeInput.value);
        if (isNaN(amount) || amount <= 0) return tg.showAlert("Введіть коректну кількість.");
        if (score < amount) return tg.showAlert("Недостатньо монет.");
        if (amount % rate !== 0) return tg.showAlert(`Сума має бути кратною ${rate.toLocaleString('uk-UA')}.`);
        const received = amount / rate;
        score -= amount; score2 += received;
        updateAllStatsUI();
        exchangeInput.value = '';
        tg.showAlert(`Ви обміняли ${amount.toLocaleString('uk-UA')} монет на ${received.toLocaleString('uk-UA')} WEE!`);
        saveProgress({ score: score, score2: score2 });
    }

    function handleInvite() {
        if (!userId) return tg.showAlert('Не вдалося отримати ID.');
        const botUsername = 'YourBotUsername'; 
        const link = `https://t.me/${botUsername}?start=ref_${userId}`;
        tg.switchInlineQuery(`Привіт! Приєднуйся до гри WeeClick та заробляй!\n\n${link}`, []);
    }

    async function loadLeaderboard(type = 'all-time') {
        leaderboardList.innerHTML = `<div id="loader-spinner" class="text-center p-10"><i class="fas fa-spinner fa-spin fa-3x text-gray-400"></i></div>`;
        const field = type === 'monthly' ? 'monthlyScore' : 'score';
        const q = query(collection(db, "players"), orderBy(field, "desc"), limit(100));
        try {
            const querySnapshot = await getDocs(q);
            leaderboardList.innerHTML = '';
            let rank = 1;
            querySnapshot.forEach((doc) => {
                const player = doc.data();
                const scoreToShow = player[field] || 0;
                const el = document.createElement('div');
                el.className = 'flex items-center bg-white p-3 rounded-xl shadow-sm';
                el.innerHTML = `<span class="font-bold text-lg w-10 text-gray-500">${rank}</span><img src="${player.photo_url || 'https://placehold.co/128x128/E0E0E0/BDBDBD?text=?'}" class="w-10 h-10 rounded-full mr-3 border-2 border-gray-200"><div class="flex-grow"><p class="font-bold truncate">${player.firstName || 'Player'}</p><p class="text-sm text-gray-500">${scoreToShow.toLocaleString('uk-UA')}</p></div>`;
                leaderboardList.appendChild(el);
                rank++;
            });
        } catch (error) {
            leaderboardList.innerHTML = '<p class="text-center text-red-500">Не вдалося завантажити.</p>';
        }
    }

    function updateSeasonTimer() {
        const now = new Date(), end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const diff = end - now;
        if (diff < 0) { seasonTimer.textContent = "Завершено!"; return; }
        const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
        seasonTimer.textContent = `${d}д ${h}г ${m}хв ${s}с`;
    }

    function calculateTaskCost() {
        const reward = parseInt(taskRewardInput.value) || 0;
        const goal = parseInt(taskGoalInput.value) || 0;
        const total = reward * goal;
        const commission = total * 0.02;
        const final = total + commission;
        calcTotalSpan.textContent = total.toLocaleString('uk-UA');
        calcCommissionSpan.textContent = commission.toLocaleString('uk-UA');
        calcFinalSpan.textContent = `${final.toLocaleString('uk-UA')} WEE`;
    }

    async function confirmAndCreateTask() {
        const url = taskUrlInput.value, reward = parseInt(taskRewardInput.value), goal = parseInt(taskGoalInput.value);
        if (!url || !/^(https?|tg):\/\/[^\s/$.?#].[^\s]*$/i.test(url)) return tg.showAlert('Введіть коректне посилання.');
        if (isNaN(reward) || reward <= 0) return tg.showAlert('Вкажіть коректну нагороду.');
        if (isNaN(goal) || goal <= 5) return tg.showAlert('Мінімальна кількість виконань - 5.');

        const finalCost = (reward * goal) * 1.02;
        if (score2 < finalCost) return tg.showAlert(`Недостатньо WEE. Потрібно ${finalCost.toLocaleString('uk-UA')}.`);

        createTaskConfirmBtn.disabled = true; createTaskConfirmBtn.textContent = 'Створення...';
        try {
            await addDoc(collection(db, 'customTasks'), {
                creatorId: userId,
                url: url,
                reward: reward,
                goal: goal,
                currentVisits: 0,
                isActive: true,
                createdAt: serverTimestamp(),
            });
            score2 -= finalCost;
            await saveProgress({ score2: score2 });
            updateAllStatsUI();
            tg.showAlert('Завдання успішно створено!');
            showPage('tasks-page');
            taskUrlInput.value = ''; taskRewardInput.value = ''; taskGoalInput.value = '';
        } catch (e) {
            tg.showAlert('Помилка створення завдання.');
        } finally {
            createTaskConfirmBtn.disabled = false; createTaskConfirmBtn.textContent = 'Створити та оплатити';
        }
    }

    async function loadCustomTasks() {
        customTasksContainer.innerHTML = '';
        const q = query(collection(db, "customTasks"), where("isActive", "==", true), where("creatorId", "!=", userId), orderBy("createdAt", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const task = doc.data();
            const el = document.createElement('div');
            el.className = 'task-card bg-white p-4 rounded-xl border border-gray-200';
            el.innerHTML = `<div><h3 class="font-bold truncate">Перейти за посиланням</h3><p class="text-sm text-gray-600">Нагорода: ${task.reward.toLocaleString('uk-UA')} монет</p></div>
            <button data-task-id="${doc.id}" data-url="${task.url}" class="mt-2 task-button w-full js-custom-task-btn">Виконати (${task.currentVisits}/${task.goal})</button>`;
            customTasksContainer.appendChild(el);
        });
        document.querySelectorAll('.js-custom-task-btn').forEach(btn => btn.addEventListener('click', handleCustomTaskCompletion));
    }

    async function handleCustomTaskCompletion(event) {
        const button = event.target;
        const taskId = button.dataset.taskId, url = button.dataset.url;
        button.disabled = true; button.classList.add('disabled');
        try {
            const completeCustomTask = httpsCallable(functions, 'completeCustomTask');
            const result = await completeCustomTask({ taskId: taskId });
            if (result.data.success) {
                tg.showAlert(result.data.message);
                score = result.data.newScore;
                updateAllStatsUI();
                window.open(url, '_blank');
                button.closest('.task-card').remove();
            } else {
                tg.showAlert(result.data.message || 'Помилка');
                button.disabled = false; button.classList.remove('disabled');

            }
        } catch (error) {
            tg.showAlert('Серверна помилка. Спробуйте пізніше.');
            button.disabled = false; button.classList.remove('disabled');
        }
    }
    
    initializeApp();
});
