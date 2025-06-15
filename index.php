<!DOCTYPE html>

<html lang="uk" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>WeePlayer Compact Panel</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            -webkit-touch-callout: none; -webkit-user-select: none;
            -khtml-user-select: none; -moz-user-select: none;
            -ms-user-select: none; user-select: none;
        }
        @keyframes click-burst-anim {
            0% { transform: scale(0); opacity: 0.8; }
            100% { transform: scale(3); opacity: 0; }
        }
        .click-burst {
            position: absolute; border-radius: 50%;
            background-color: #FFFFFF;
            animation: click-burst-anim 0.5s ease-out forwards;
            pointer-events: none; transform: translate(-50%, -50%);
        }
    </style>
    <script>
        tailwind.config = { darkMode: 'class', theme: { extend: { colors: { brand: '#0094FE' } } } }
    </script>
</head>
<body class="bg-gray-800 p-1.5">

  <div class="w-full h-[150px] bg-brand flex items-center justify-between text-white rounded-lg relative overflow-hidden px-2">

    <div class="flex-shrink-0 flex flex-col items-center justify-center h-full w-24 text-center cursor-pointer relative" onclick="openProfileModal(event);">
        <img src="https://raw.githubusercontent.com/Weebwe/WeeClick/main/logo.png" alt="User Avatar" class="w-16 h-16">
        <span class="font-semibold text-sm mt-1">Рівень: 47</span>
        <span class="text-xs text-gray-200">@WeePlayer</span>
    </div>

    <div class="flex-grow flex items-center justify-center h-full">
        <div class="flex items-center justify-center gap-x-4">
            <div class="flex items-center cursor-pointer relative" onclick="openModal('Дерево 🪵', 'Ваш запас дерева.'); createClickBurst(event);"><span class="text-2xl mr-2">🪵</span><span class="font-semibold text-base">811.4M</span></div>
            <div class="flex items-center cursor-pointer relative" onclick="openModal('Пшениця 🌾', 'Ваш запас пшениці.'); createClickBurst(event);"><span class="text-2xl mr-2">🌾</span><span class="font-semibold text-base">937.5M</span></div>
            <div class="flex items-center cursor-pointer relative" onclick="openModal('Камінь 🪨', 'Ваш запас каменю.'); createClickBurst(event);"><span class="text-2xl mr-2">🪨</span><span class="font-semibold text-base">291.9M</span></div>
            <div class="flex items-center cursor-pointer relative" onclick="openModal('Залізо ⛓️', 'Ваш запас заліза.'); createClickBurst(event);"><span class="text-2xl mr-2">⛓️</span><span class="font-semibold text-base">167.5M</span></div>
        </div>
    </div>

    <div class="flex-shrink-0 flex flex-col items-center justify-center h-full w-24 text-center cursor-pointer relative" onclick="openModal('WEE Coin', 'Ваша преміум валюта.'); createClickBurst(event);">
        <img src="https://raw.githubusercontent.com/Weebwe/WeeClick/main/logo.png" alt="WEE Coin" class="w-16 h-16">
        <span class="font-bold text-base mt-1">30.6K</span>
    </div>
  </div>
  
  <div id="genericModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300 opacity-0 scale-95 hidden" onclick="closeModal('genericModal')"><div class="bg-[#1e3a8a]/95 border border-white/50 rounded-2xl shadow-2xl p-6 w-full max-w-sm text-white text-center transform" onclick="event.stopPropagation();"><h3 id="modalTitle" class="text-2xl font-bold mb-4"></h3><p id="modalContent" class="text-base mb-6"></p><button onclick="closeModal('genericModal')" class="bg-white text-brand font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-gray-200">Закрити</button></div></div>
  <div id="profileModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300 opacity-0 scale-95 hidden" onclick="closeModal('profileModal')"><div class="bg-[#1e3a8a]/95 border border-white/50 rounded-2xl shadow-2xl p-6 w-full max-w-sm text-white transform" onclick="event.stopPropagation();"><div class="text-center mb-6"><img src="https://raw.githubusercontent.com/Weebwe/WeeClick/main/logo.png" class="w-24 h-24 rounded-full border-4 border-white mx-auto mb-4"/><h3 class="text-2xl font-bold">@WeePlayer</h3><p>Рівень 47</p></div><button onclick="closeModal('profileModal')" class="w-full mt-6 bg-white text-brand font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-gray-200">Вийти</button></div></div>

  <script>
    // Захист контенту
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.querySelectorAll('img').forEach(img => img.setAttribute('draggable', false));

    // Ефект сплеску при кліку
    function createClickBurst(event) {
        const target = event.currentTarget;
        if (event.target.classList.contains('click-burst')) { return; }
        const burst = document.createElement('span');
        const rect = target.getBoundingClientRect();
        burst.className = 'click-burst';
        burst.style.left = `${event.clientX - rect.left}px`;
        burst.style.top = `${event.clientY - rect.top}px`;
        burst.style.width = burst.style.height = `${Math.max(target.clientWidth, target.clientHeight) * 2}px`;
        target.appendChild(burst);
        setTimeout(() => burst.remove(), 500);
    }
    
    // Керування модальними вікнами
    function openModal(title, content) {
        const modal = document.getElementById('genericModal');
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalContent').innerText = content;
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('opacity-0', 'scale-95'), 10);
    }
    function openProfileModal(event) {
        createClickBurst(event);
        const modal = document.getElementById('profileModal');
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('opacity-0', 'scale-95'), 10);
    }
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('opacity-0', 'scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
  </script>
</body>
</html>
