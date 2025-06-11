// Імпортуємо нашу базу даних та необхідні функції Firestore
import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

    // --- Ініціалізація Telegram ---
    const tg = window.Telegram?.WebApp;
    // ... (решта ініціалізації TG без змін)

    // --- Пошук всіх елементів на сторінці ---
    // ... (без змін)

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
                // Гравець існує, завантажуємо дані
                console.log("Завантаження даних існуючого гравця...");
                const data = docSnap.data();
                score = data.score ?? 0;
                score2 = data.score2 ?? 10;
                lives = data.lives ?? 3;
                completedTasks = data.completedTasks ?? [];
                isMusicEnabled = data.settings?.isMusicEnabled ?? true;
                areEffectsEnabled = data.settings?.areEffectsEnabled ?? true;

                // Відновлюємо стан виконаних завдань
                completedTasks.forEach(taskId => updateTaskView(taskId));
                
            } else {
                // Новий гравець, створюємо документ
                console.log("Створення нового гравця...");
                const initialData = {
                    score: 0,
                    score2: 10,
                    lives: 3,
                    completedTasks: [],
                    firstName: user.first_name || "Guest",
                    username: user.username || "unknown",
                    createdAt: serverTimestamp(),
                    settings: {
                        isMusicEnabled: true,
                        areEffectsEnabled: true
                    }
                };
                await setDoc(playerDocRef, initialData);
            }
        } catch (error) {
            console.error("Помилка роботи з Firestore:", error);
            tg.showAlert("Не вдалося завантажити профіль. Перевірте з'єднання з інтернетом.");
            return;
        }

        // Запускаємо решту програми з актуальними даними
        populateProfileData(user);
        updateAllStatsUI();
        updateSettingsUI();
        setupEventListeners();
        showPage('home-page'); 
        startLoadingSimulation();
    }

    // Збереження даних у Firestore
    async function saveProgress(dataToSave) {
        if (!playerDocRef) return;
        try {
            await updateDoc(playerDocRef, dataToSave);
            console.log("Прогрес збережено:", dataToSave);
        } catch (error) {
            console.error("Помилка збереження прогресу:", error);
        }
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
            
            if (score % 20 === 0) { // Зберігаємо кожні 20 кліків
                saveProgress({ score: score });
            }
        });
        
        // ... (решта слухачів)
    }

    function toggleMusic() {
        isMusicEnabled = !isMusicEnabled;
        updateSettingsUI();
        saveProgress({ 'settings.isMusicEnabled': isMusicEnabled });
        // ...
    }

    function toggleEffects() {
        areEffectsEnabled = !areEffectsEnabled;
        updateSettingsUI();
        saveProgress({ 'settings.areEffectsEnabled': areEffectsEnabled });
    }

    function updateTaskView(taskId) {
        const taskCard = document.getElementById(taskId);
        if (taskCard) {
            taskCard.classList.add('completed');
            const button = taskCard.querySelector('button.task-button, button.bg-\\[\\#0094FE\\]');
            if(button) {
                button.disabled = true;
                button.textContent = 'Виконано';
            }
            if (tasksContainer) tasksContainer.appendChild(taskCard);
        }
    }

    function handleTaskCompletion(taskCard, reward) {
        if (!taskCard || taskCard.classList.contains('completed')) return;

        score += reward;
        completedTasks.push(taskCard.id); // Додаємо ID завдання до списку
        
        updateAllStatsUI();
        updateTaskView(taskCard.id); // Оновлюємо вигляд
        
        tg.showAlert(`Нагороду в ${reward.toLocaleString('uk-UA')} монет зараховано!`);
        
        // Зберігаємо оновлений рахунок і список завдань
        saveProgress({
            score: score,
            completedTasks: completedTasks
        });
    }

    // ... (інші функції: updateAllStatsUI, animateClick, showPage, etc. залишаються схожими,
    // але більше не потребують роботи з localStorage)

    // Запускаємо додаток
    initializeApp();
});
