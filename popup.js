// Get the capture button and status element from the DOM
const captureBtn = document.getElementById('captureBtn');
const statusEl = document.getElementById('status');
const spinner = document.getElementById('spinner');
const btnText = document.getElementById('btnText');

// Add a click event listener to the capture button
captureBtn.addEventListener('click', () => {
    // Disable the button and show a status message to prevent multiple clicks
    captureBtn.disabled = true;
    statusEl.textContent = 'Capturing... please wait.';
    spinner.classList.remove('hidden');
    btnText.textContent = 'Capturing...';

    // Send a message to the background script to start the capture process
    chrome.runtime.sendMessage({ action: "captureFullPage" }, (response) => {
        spinner.classList.add('hidden');
        btnText.textContent = 'Capture Full Page';
        if (response && response.status === "complete") {
            // If capture is complete, briefly notify the user and close the popup
            statusEl.textContent = 'Capture complete! Opening new tab...';
            setTimeout(() => {
                window.close();
            }, 1000);
        } else {
            // If there was an error, display it
            statusEl.textContent = 'Error taking screenshot.';
            console.error("Error from background:", response);
            // Re-enable the button if there was an error
            captureBtn.disabled = false;
        }
    });
});
