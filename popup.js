// DOM Elements
const views = {
    'view-home': document.getElementById('view-home'),
    'view-history': document.getElementById('view-history'),
    'view-settings': document.getElementById('view-settings'),
    'view-about': document.getElementById('view-about')
};

const navButtons = document.querySelectorAll('.nav-btn');
const captureBtn = document.getElementById('captureBtn');
const statusEl = document.getElementById('status');
const spinner = document.getElementById('spinner');
const btnText = document.getElementById('btnText');
const settingFormat = document.getElementById('setting-format');
const settingDelay = document.getElementById('setting-delay');
const delayVal = document.getElementById('delay-val');

// State
let currentSettings = {
    format: 'png',
    delay: 0
};

// --- Initialization ---

document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    renderHistory();
    setupNavigation();
    setupSettingsListeners();
});

// --- Navigation ---

function setupNavigation() {
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            switchView(target);
        });
    });
}

function switchView(targetId) {
    // Update Views
    Object.keys(views).forEach(key => {
        if (key === targetId) {
            views[key].classList.remove('hidden');
            // Allow a small delay for fade-in effect if needed, 
            // but for now simple hidden toggle works with the CSS transition if we used opacity.
            // Since we used display:none (hidden), transitions won't trigger automatically on display change 
            // unless we do requestAnimationFrame. For now, simple toggle is fine.
        } else {
            views[key].classList.add('hidden');
        }
    });

    // Update Nav Buttons
    navButtons.forEach(btn => {
        if (btn.dataset.target === targetId) {
            btn.classList.add('active');
            btn.classList.remove('text-slate-400');
            // The active class in CSS handles the color (indigo-600)
        } else {
            btn.classList.remove('active');
            btn.classList.add('text-slate-400');
        }
    });

    // Refresh history if entering history view
    if (targetId === 'view-history') {
        renderHistory();
    }
}

// --- Settings ---

async function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['settings'], (result) => {
            if (result.settings) {
                currentSettings = { ...currentSettings, ...result.settings };
            }
            // Update UI
            settingFormat.value = currentSettings.format;
            settingDelay.value = currentSettings.delay;
            delayVal.textContent = `${currentSettings.delay}s`;

            // Update Background Style of Range Slider
            const percentage = (currentSettings.delay / 5) * 100;
            settingDelay.style.background = `linear-gradient(to right, #4f46e5 ${percentage}%, #e2e8f0 ${percentage}%)`;

            resolve();
        });
    });
}

function saveSettings() {
    const newSettings = {
        format: settingFormat.value,
        delay: parseInt(settingDelay.value, 10)
    };
    currentSettings = newSettings;
    chrome.storage.local.set({ settings: newSettings });
}

function setupSettingsListeners() {
    settingFormat.addEventListener('change', saveSettings);

    settingDelay.addEventListener('input', (e) => {
        const val = e.target.value;
        delayVal.textContent = `${val}s`;

        // Update slider track background dynamically
        const percentage = (val / 5) * 100;
        e.target.style.background = `linear-gradient(to right, #4f46e5 ${percentage}%, #e2e8f0 ${percentage}%)`;

        saveSettings();
    });
}

// --- History ---

function renderHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';

    chrome.storage.local.get(['captureHistory'], (result) => {
        const history = result.captureHistory || [];

        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 text-center fade-in">
                    <div class="bg-slate-50 p-6 rounded-full mb-4 border border-slate-100 animate-float">
                        <svg class="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                    <p class="text-slate-600 font-semibold text-sm">No captures yet</p>
                    <p class="text-slate-400 text-xs mt-1">Your snapshots will appear here</p>
                </div>`;
            return;
        }

        history.forEach((item, index) => {
            const el = document.createElement('div');
            // Premium card styling
            el.className = 'bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white shadow-sm ring-1 ring-slate-100 flex justify-between items-center group hover:ring-indigo-100/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 mb-3';

            // Format date
            const date = new Date(item.timestamp);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            el.innerHTML = `
                <div class="overflow-hidden mr-3">
                    <p class="font-bold text-slate-800 text-sm truncate" title="${item.title}">${item.title || 'Untitled Page'}</p>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-[10px] text-slate-400 font-medium">${dateStr}</span>
                    </div>
                    <p class="text-[10px] text-indigo-500 truncate font-semibold bg-indigo-50 px-2 py-0.5 rounded-md inline-block mt-2 max-w-full border border-indigo-100/50">${item.url}</p>
                </div>
                <button class="delete-btn text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all duration-200 group-hover:text-slate-400" data-index="${index}" title="Remove">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            `;
            historyList.appendChild(el);
        });

        // Add listeners to delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index, 10);
                deleteHistoryItem(index);
            });
        });
    });
}



function deleteHistoryItem(index) {
    chrome.storage.local.get(['captureHistory'], (result) => {
        const history = result.captureHistory || [];
        if (index >= 0 && index < history.length) {
            history.splice(index, 1);
            chrome.storage.local.set({ captureHistory: history }, () => {
                renderHistory();
            });
        }
    });
}

// --- Capture Logic ---

captureBtn.addEventListener('click', async () => {
    // 1. Check settings
    const delayMs = (currentSettings.delay || 0) * 1000;

    // UI Updates
    captureBtn.disabled = true;
    captureBtn.classList.add('opacity-75', 'cursor-not-allowed'); // Visual feedback

    // Status handling
    statusEl.classList.remove('opacity-0');

    const originalBtnText = btnText.textContent;
    btnText.textContent = delayMs > 0 ? `Starting in ${currentSettings.delay}s...` : 'Capturing...';

    if (delayMs > 0) {
        statusEl.textContent = `Waiting ${currentSettings.delay} seconds...`;
        await new Promise(r => setTimeout(r, delayMs));
    }

    statusEl.textContent = 'Capturing... please wait';
    spinner.classList.remove('hidden');
    document.getElementById('cameraIcon').classList.add('hidden'); // Hide camera icon while spinning
    btnText.textContent = 'Capturing...';

    // Get current tab info for history
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send capture message
    chrome.runtime.sendMessage({
        action: "captureFullPage",
        format: currentSettings.format
    }, (response) => {
        spinner.classList.add('hidden');
        document.getElementById('cameraIcon').classList.remove('hidden');
        btnText.textContent = 'Capture Page';
        captureBtn.disabled = false;
        captureBtn.classList.remove('opacity-75', 'cursor-not-allowed');

        if (response && response.status === "complete") {
            statusEl.textContent = 'Done! Opening review...';
            statusEl.classList.add('text-green-600');
            statusEl.classList.remove('text-indigo-600');

            setTimeout(() => {
                window.close();
            }, 1000);
        } else {
            statusEl.textContent = 'Error taking screenshot.';
            statusEl.classList.add('text-red-500');
            statusEl.classList.remove('text-indigo-600');
            console.error("Error:", response);
        }
    });
});
