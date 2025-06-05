
const connectButton = document.getElementById("connect-button");
const walletStatus = document.getElementById("wallet-status");
const walletAddress = document.getElementById("wallet-address");

async function connectTON() {
  const tonConnect = new TON_CONNECT.TonConnect();

  await tonConnect.restoreConnection();

  const walletInfo = await tonConnect.connectWallet();
  if (walletInfo && walletInfo.account.address) {
    walletStatus.textContent = "✅ Підключено";
    walletAddress.textContent = `Адреса: ${walletInfo.account.address}`;
  } else {
    walletStatus.textContent = "❌ Помилка підключення";
  }
}

connectButton.addEventListener("click", connectTON);
