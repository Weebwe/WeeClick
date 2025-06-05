// Ініціалізація Firebase (встав свій firebaseConfig сюди)
const firebaseConfig = {
  apiKey: "AIzaSyCS4Kae1c1hDf7KVfKAQp3UwKDeRCq3HRA",
  authDomain: "weeclick-85bd9.firebaseapp.com",
  projectId: "weeclick-85bd9",
  storageBucket: "weeclick-85bd9.appspot.com",
  messagingSenderId: "793288874462",
  appId: "1:793288874462:web:bb5db998662295df3c654f"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// TonConnect
const tonConnect = new TonConnect();

let userAddress = null;
let clickCount = 0;
let coins = 0;
let tasks = [
  { id: 1, description: "Зробіть 10 кліків", target: 10, reward: 5, done: false },
  { id: 2, description: "Зберіть 50 монет", target: 50, reward: 15, done: false },
];

const elements = {
  walletStatus: document.getElementById("wallet-status"),
  walletAddress: document.getElementById("wallet-address"),
  connectButton: document.getElementById("connect-button"),
  clickButton: document.getElementById("click-button"),
  clickCount: document.getElementById("click-count"),
  coinsCount: document.getElementById("coins-count"),
  tasksList: document.getElementById("tasks-list"),
  leaderboardList: document.getElementById("leaderboard-list"),
  dailyBonusMessage: document.getElementById("dailybonus-message"),
  claimDailyBonusBtn: document.getElementById("claim-dailybonus"),
  sections: document.querySelectorAll(".section"),
  navButtons: {
    play: document.getElementById("btn-play"),
    tasks: document.getElementById("btn-tasks"),
    leaderboard: document.getElementById("btn-leaderboard"),
    dailybonus: document.getElementById("btn-dailybonus"),
  },
};

// Показати обрану секцію
function showSection(id) {
  elements.sections.forEach((sec) => {
    sec.id === id + "-section" ? sec.classList.add("active") : sec.classList.remove("active");
  });
}

// TON гаманець: Підключення
elements.connectButton.addEventListener("click", async () => {
  try {
    const session = await tonConnect.connect();
    userAddress = session.account.address;
    elements.walletStatus.textContent = "🔌 Підключено";
    elements.walletAddress.textContent = userAddress;
    loadUserData();
    updateLeaderboard();
  } catch (err) {
    alert("Помилка підключення TON гаманця: " + err.message);
  }
});

// Збереження даних користувача
function saveUserData() {
  if (!userAddress) return;
  database.ref("users/" + userAddress).set({
    clicks: clickCount,
    coins: coins,
    tasksDone: tasks.filter(t => t.done).map(t => t.id),
    lastDailyBonus: localStorage.getItem("lastDailyBonus_" + userAddress) || 0,
  });
}

// Завантаження даних користувача
function loadUserData() {
  if (!userAddress) return;
  database.ref("users/" + userAddress).once("value").then(snapshot => {
    const data = snapshot.val();
    if (data) {
      clickCount = data.clicks || 0;
      coins = data.coins || 0;
      const doneTasks = data.tasksDone || [];
      tasks.forEach(t => t.done = doneTasks.includes(t.id));
      localStorage.setItem("lastDailyBonus_" + userAddress, data.lastDailyBonus || 0);
    }
    updateUI();
    renderTasks();
  });
}

// Оновлення інтерфейсу
function updateUI() {
  elements.clickCount.textContent = clickCount;
  elements.coinsCount.textContent = coins;
}

// Обробник кліка
elements.clickButton.addEventListener("click", () => {
  clickCount++;
  coins++;
  checkTasksProgress();
  updateUI();
  saveUserData();
});

// Відобразити завдання
function renderTasks() {
  elements.tasksList.innerHTML = "";
  tasks.forEach(task => {
    const li = document.createElement("li");
    li.textContent = `${task.description} ${task.done ? "(Виконано)" : ""}`;
    elements.tasksList.appendChild(li);
  });
}

// Перевірка виконання завдань
function checkTasksProgress() {
  tasks.forEach(task => {
    if (!task.done) {
      if (task.id === 1 && clickCount >= task.target) {
        task.done = true;
        coins += task.reward;
        alert(`Завдання "${task.description}" виконано! Ви отримали ${task.reward} монет.`);
      }
      if (task.id === 2 && coins >= task.target) {
        task.done = true;
        coins += task.reward;
        alert(`Завдання "${task.description}" виконано! Ви отримали ${task.reward} монет.`);
      }
    }
  });
  renderTasks();
}

// Лідерборд - зчитування та оновлення
function updateLeaderboard() {
  database.ref("users").orderByChild("coins").limitToLast(10).once("value", snapshot => {
    const users = [];
    snapshot.forEach(childSnapshot => {
      users.push({
        address: childSnapshot.key,
        coins: childSnapshot.val().coins || 0
      });
    });
    users.sort((a, b) => b.coins - a.coins);

    elements.leaderboardList.innerHTML = "";
    users.forEach(user => {
      const li = document.createElement("li");
      li.textContent = `${user.address.substring(0, 6)}...: ${user.coins} монет`;
      elements.leaderboardList.appendChild(li);
    });
  });
}

// Щоденний бонус
elements.claimDailyBonusBtn.addEventListener("click", () => {
  if (!userAddress) {
    alert("Підключіть гаманець, щоб отримати бонус");
    return;
  }
  const lastClaim = parseInt(localStorage.getItem("lastDailyBonus_" + userAddress)) || 0;
  const now = Date.now();
  if (now - lastClaim < 24 * 60 * 60 * 1000) {
    alert("Бонус вже отримано сьогодні. Спробуйте завтра.");
    return;
  }
  const bonus = 20;
  coins += bonus;
  localStorage.setItem("lastDailyBonus_" + userAddress, now.toString());
  alert(`Ви отримали щоденний бонус: ${bonus} монет!`);
  updateUI();
  saveUserData();
});

// Навігація
elements.navButtons.play.addEventListener("click", () => showSection("play"));
elements.navButtons.tasks.addEventListener("click", () => showSection("tasks"));
elements.navButtons.leaderboard.addEventListener("click", () => {
  showSection("leaderboard");
  updateLeaderboard();
});
elements.navButtons.dailybonus.addEventListener("click", () => showSection("dailybonus"));

// Початкові налаштування
showSection("play");
updateUI();
renderTasks();
