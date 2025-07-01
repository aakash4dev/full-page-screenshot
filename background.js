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
