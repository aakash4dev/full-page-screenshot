// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Main trigger from the popup
    if (request.action === "captureFullPage") {
        captureFullPage(sendResponse);
        return true; // Indicates that the response will be sent asynchronously
    }

    // Trigger from the content script to take a single screenshot
    if (request.action === "captureVisibleTab") {
        chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                console.error("Capture error:", chrome.runtime.lastError.message);
                sendResponse({ error: chrome.runtime.lastError.message });
            } else {
                sendResponse(dataUrl);
            }
        });
        return true; // Indicates that the response will be sent asynchronously
    }
});

async function captureFullPage(sendResponse) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Inject the content script into the active tab
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });

        // Send a message to the content script to start the process
        chrome.tabs.sendMessage(tab.id, { action: "scrollAndCapture" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error communicating with content script:", chrome.runtime.lastError.message);
                sendResponse({ status: "error", message: chrome.runtime.lastError.message });
                return;
            }

            if (response && response.status === "complete") {
                // Save to history
                addToHistory({
                    url: tab.url,
                    title: tab.title,
                    timestamp: Date.now()
                });

                // Open the review page in a new tab
                chrome.tabs.create({ url: 'review.html' });
                sendResponse({ status: "complete" });
            } else {
                console.error("Error reported from content script:", response);
                sendResponse({ status: "error", message: response ? response.message : "An unknown error occurred" });
            }
        });
    } catch (error) {
        console.error("Failed to capture full page:", error);
        sendResponse({ status: "error", message: error.message });
    }
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
