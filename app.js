// Отримуємо елементи інтерфейсу
const connectButton = document.getElementById("connect-button");
const walletStatus = document.getElementById("wallet-status");
const walletAddress = document.getElementById("wallet-address");

// Функція підключення TON-гаманця через TonConnect
async function connectTON() {
  try {
    const tonConnect = new TON_CONNECT.TonConnect();

    // Відновлюємо попереднє підключення, якщо було
    await tonConnect.restoreConnection();

    // Запитуємо підключення гаманця
    const walletInfo = await tonConnect.connectWallet();

    if (walletInfo && walletInfo.account.address) {
      walletStatus.textContent = "✅ Підключено";
      walletAddress.textContent = `Адреса: ${walletInfo.account.address}`;
    } else {
      walletStatus.textContent = "❌ Помилка підключення";
      walletAddress.textContent = "";
    }
  } catch (error) {
    walletStatus.textContent = "❌ Сталася помилка";
    walletAddress.textContent = "";
    console.error("Помилка підключення TON:", error);
  }
}

// Встановлюємо обробник кліку по кнопці підключення
connectButton.addEventListener("click", connectTON);
