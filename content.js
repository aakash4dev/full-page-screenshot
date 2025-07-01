// This script is injected into the webpage to control scrolling and capture.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrollAndCapture") {
        scrollAndCapture(sendResponse);
        return true; // Indicates that the response will be sent asynchronously.
    }
});

async function scrollAndCapture(sendResponse) {
    // Inject CSS to hide scrollbars
    const style = document.createElement('style');
    style.id = 'hide-scrollbar-style';
    style.innerHTML = `
      ::-webkit-scrollbar { display: none !important; }
      html, body { scrollbar-width: none !important; -ms-overflow-style: none !important; }
    `;
    document.head.appendChild(style);
    try {
        const capturedChunks = [];
        const originalScrollX = window.scrollX;
        const originalScrollY = window.scrollY;
        
        // Use the most robust scrollable element
        const scrollableElement = document.scrollingElement || document.documentElement;
        const pageHeight = scrollableElement.scrollHeight;
        const windowHeight = window.innerHeight;
        let scrollTop = 0;

        // Scroll to the top of the page before starting
        window.scrollTo(0, 0);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for scroll and render

        while (scrollTop < pageHeight) {
            // Tell the background script to capture the visible part
            const dataUrl = await chrome.runtime.sendMessage({ action: "captureVisibleTab" });
            if (dataUrl.error) throw new Error(dataUrl.error);
            
            capturedChunks.push(dataUrl);

            // Scroll down by the height of the window, or to the end
            scrollTop += windowHeight;
            window.scrollTo(0, scrollTop);

            // Wait for the scroll to complete and content to render
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // If we've scrolled past the end, break the loop
            if (window.scrollY + windowHeight >= pageHeight) {
                 // One last capture to get the very bottom of the page
                 const lastDataUrl = await chrome.runtime.sendMessage({ action: "captureVisibleTab" });
                 if (lastDataUrl.error) throw new Error(lastDataUrl.error);
                 capturedChunks.push(lastDataUrl);
                 break;
            }
        }

        // Store the captured chunks in chrome.storage.local to pass to the review page
        await chrome.storage.local.set({ capturedChunks: capturedChunks });
        
        // Restore original scroll position
        window.scrollTo(originalScrollX, originalScrollY);

        sendResponse({ status: "complete" });

    } catch (error) {
        console.error("Error during scroll and capture:", error);
        sendResponse({ status: "error", message: error.message });
    } finally {
        // Remove the scrollbar-hiding style
        if (style.parentNode) {
            style.parentNode.removeChild(style);
        }
    }
}
