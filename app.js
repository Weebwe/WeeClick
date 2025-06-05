import { TonConnectUI } from 'https://unpkg.com/@tonconnect/ui@latest/dist/tonconnect-ui.min.js';

const tonConnectUI = new TonConnectUI({
  manifestUrl: 'https://weeclick-85bd9.web.app/tonconnect-manifest.json',
  buttonRootId: 'ton-connect-button'
});

tonConnectUI.connectionRestored.then(() => {
  tonConnectUI.connectedWallet().then(wallet => {
    if (wallet) {
      document.getElementById("wallet-status").textContent = "🔌 Підключено";
      document.getElementById("wallet-address").textContent = wallet.account.address;
    } else {
      document.getElementById("wallet-status").textContent = "❌ Не підключено";
    }
  });
});

let count = 0;
const button = document.getElementById("click-button");
const counter = document.getElementById("counter");

button.addEventListener("click", () => {
  count++;
  counter.textContent = count;
});
