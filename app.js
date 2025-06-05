
import { TonConnectUI } from "https://unpkg.com/@tonconnect/ui@latest/dist/tonconnect-ui.min.js";

const tonConnectUI = new TonConnectUI({
  manifestUrl: "https://weebwe.github.io/WeeClick/tonconnect-manifest.json",
  buttonRootId: "ton-connect-button"
});

// Створюємо елемент для виводу адреси
const walletAddressElement = document.createElement("div");
walletAddressElement.id = "wallet-address";
walletAddressElement.style.marginTop = "20px";
walletAddressElement.style.fontSize = "18px";
walletAddressElement.style.color = "#0094FE";
document.body.appendChild(walletAddressElement);

// Очікуємо підключення гаманця
tonConnectUI.connectionRestored.then(() => {
  const wallet = tonConnectUI.wallet;
  if (wallet && wallet.account && wallet.account.address) {
    walletAddressElement.textContent = "Ваша адреса: " + wallet.account.address;
  } else {
    walletAddressElement.textContent = "Гаманець не підключено";
  }
});

// Слухаємо зміну статусу підключення
tonConnectUI.onStatusChange(wallet => {
  if (wallet && wallet.account && wallet.account.address) {
    walletAddressElement.textContent = "Ваша адреса: " + wallet.account.address;
  } else {
    walletAddressElement.textContent = "Гаманець не підключено";
  }
});
