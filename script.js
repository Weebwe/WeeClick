const player = document.getElementById('player');
const gameContainer = document.getElementById('game-container');
const scoreDisplay = document.getElementById('score');

let playerX = 50; // Початкова X-координата персонажа
let playerY = 0;  // Початкова Y-координата (0 - це низ контейнера)
const playerSpeed = 5; // Швидкість руху персонажа
const jumpStrength = 80; // Сила стрибка
let isJumping = false;
const gravity = 0.5; // Гравітація

let score = 0;
let coins = []; // Масив для зберігання монеток

// Функція оновлення позиції персонажа
function updatePlayerPosition() {
    player.style.left = playerX + 'px';
    // Для Y-координати, оскільки bottom: 0; відповідає playerY = 0
    player.style.bottom = playerY + 'px';
}

// Функція стрибка
function jump() {
    if (!isJumping) {
        isJumping = true;
        let jumpHeight = 0;
        const jumpInterval = setInterval(() => {
            if (jumpHeight < jumpStrength) {
                jumpHeight += 5;
                playerY += 5;
            } else {
                clearInterval(jumpInterval);
                fall();
            }
            updatePlayerPosition();
        }, 20);
    }
}

// Функція падіння (гравітація)
function fall() {
    const fallInterval = setInterval(() => {
        if (playerY > 0) {
            playerY -= 5; // Швидкість падіння
            if (playerY < 0) playerY = 0; // Переконаємось, що не провалиться під землю
        } else {
            clearInterval(fallInterval);
            isJumping = false;
        }
        updatePlayerPosition();
    }, 20);
}

// Обробка натискань клавіш
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowLeft':
            playerX = Math.max(0, playerX - playerSpeed); // Не виходимо за лівий край
            break;
        case 'ArrowRight':
            playerX = Math.min(gameContainer.clientWidth - player.clientWidth, playerX + playerSpeed); // Не виходимо за правий край
            break;
        case 'ArrowUp':
        case ' ': // Пробіл для стрибка
            jump();
            break;
    }
    updatePlayerPosition();
});

// Функція створення монеток
function createCoin() {
    const coin = document.createElement('div');
    coin.classList.add('coin');
    // Випадкова позиція по X, щоб монетки з'являлися в різних місцях
    coin.style.left = Math.random() * (gameContainer.clientWidth - coin.clientWidth) + 'px';
    // З'являються зверху
    coin.style.bottom = (gameContainer.clientHeight - coin.clientHeight) * Math.random() * 0.5 + 50 + 'px'; // Щоб не надто високо
    gameContainer.appendChild(coin);
    coins.push(coin);
}

// Функція перевірки зіткнень з монетками
function checkCoinCollision() {
    coins.forEach((coin, index) => {
        const playerRect = player.getBoundingClientRect();
        const coinRect = coin.getBoundingClientRect();

        // Проста перевірка зіткнень
        if (
            playerRect.left < coinRect.right &&
            playerRect.right > coinRect.left &&
            playerRect.top < coinRect.bottom &&
            playerRect.bottom > coinRect.top
        ) {
            // Зіткнення!
            score++;
            scoreDisplay.textContent = `Очки: ${score}`;
            coin.remove(); // Видаляємо монетку
            coins.splice(index, 1); // Видаляємо з масиву
        }
    });
}

// Ініціалізація гри
function initGame() {
    updatePlayerPosition();
    // Створюємо кілька монеток на старті
    for (let i = 0; i < 5; i++) {
        createCoin();
    }

    // Генеруємо нові монетки кожні 2 секунди
    setInterval(createCoin, 2000);

    // Головний ігровий цикл
    setInterval(checkCoinCollision, 50); // Перевіряємо зіткнення часто
}

initGame();
