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

// Settings Inputs
const settingFormat = document.getElementById('setting-format');
const settingDelay = document.getElementById('setting-delay');
const settingAutoDownload = document.getElementById('setting-auto-download');
const delayVal = document.getElementById('delay-val');

// State
let currentSettings = {
    format: 'png',
    delay: 0,
    autoDownload: false
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
        } else {
            views[key].classList.add('hidden');
        }
    });

    // Update Nav Buttons
    navButtons.forEach(btn => {
        if (btn.dataset.target === targetId) {
            btn.classList.add('text-indigo-600');
            btn.classList.remove('text-slate-400');
        } else {
            btn.classList.add('text-slate-400');
            btn.classList.remove('text-indigo-600');
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
        chrome.storage.sync.get(['settings'], (result) => {
            if (result.settings) {
                currentSettings = result.settings;
            }
            // Update UI
            settingFormat.value = currentSettings.format;
            settingDelay.value = currentSettings.delay;
            delayVal.textContent = `${currentSettings.delay}s`;
            settingAutoDownload.checked = currentSettings.autoDownload;
            resolve();
        });
    });
}

function saveSettings() {
    const newSettings = {
        format: settingFormat.value,
        delay: parseInt(settingDelay.value, 10),
        autoDownload: settingAutoDownload.checked
    };
    currentSettings = newSettings;
    chrome.storage.sync.set({ settings: newSettings });
}

function setupSettingsListeners() {
    settingFormat.addEventListener('change', saveSettings);
    settingDelay.addEventListener('input', (e) => {
        delayVal.textContent = `${e.target.value}s`;
        saveSettings();
    });
    settingAutoDownload.addEventListener('change', saveSettings);
}

// --- History ---

function renderHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';

    chrome.storage.local.get(['captureHistory'], (result) => {
        const history = result.captureHistory || [];

        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="text-center text-slate-400 py-10 flex flex-col items-center">
                    <svg class="w-12 h-12 text-slate-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <p class="text-sm">No captures yet</p>
                </div>`;
            return;
        }

        history.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center group';

            // Format date
            const date = new Date(item.timestamp);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            el.innerHTML = `
                <div class="overflow-hidden mr-3">
                    <p class="font-medium text-slate-800 text-sm truncate" title="${item.url}">${item.title || 'Untitled Page'}</p>
                    <p class="text-[10px] text-slate-500 truncate">${dateStr}</p>
                    <p class="text-[10px] text-indigo-400 truncate mt-0.5">${item.url}</p>
                </div>
                <button class="delete-btn text-slate-300 hover:text-red-500 p-1 rounded-md transition-colors" data-index="${index}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
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

function addToHistory(item) {
    chrome.storage.local.get(['captureHistory'], (result) => {
        const history = result.captureHistory || [];
        history.unshift(item); // Add to beginning
        // Limit to 50 items
        if (history.length > 50) history.pop();
        chrome.storage.local.set({ captureHistory: history });
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
    btnText.textContent = delayMs > 0 ? `Starting in ${currentSettings.delay}s...` : 'Capturing...';

    if (delayMs > 0) {
        statusEl.textContent = `Waiting ${currentSettings.delay} seconds...`;
        await new Promise(r => setTimeout(r, delayMs));
    }

    statusEl.textContent = 'Capturing... please wait';
    spinner.classList.remove('hidden');
    btnText.textContent = 'Capturing...';

    // Get current tab info for history
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send capture message
    // Note: We are just sending the action. The background/content scripts currently handle the heavy lifting.
    // To support formats properly, the background script needs update, but we will send the setting anyway.
    chrome.runtime.sendMessage({
        action: "captureFullPage",
        format: currentSettings.format
    }, (response) => {
        spinner.classList.add('hidden');
        btnText.textContent = 'Capture';
        captureBtn.disabled = false;

        if (response && response.status === "complete") {
            statusEl.textContent = 'Done! Opening review...';

            // Add to history
            if (tab) {
                addToHistory({
                    url: tab.url,
                    title: tab.title,
                    timestamp: Date.now()
                });
            }

            setTimeout(() => {
                window.close();
            }, 1000);
        } else {
            statusEl.textContent = 'Error taking screenshot.';
            console.error("Error:", response);
        }
    });
});
