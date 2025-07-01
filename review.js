document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('screenshotCanvas');
    const ctx = canvas.getContext('2d');
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const loader = document.getElementById('loader');
    const stitchedImage = document.getElementById('stitchedImage');
    let images = [];
    let chunks = [];

    // Hide the canvas (not needed visually)
    canvas.style.display = 'none';

    // Show loader and disable buttons initially
    loader.classList.remove('hidden');
    downloadBtn.disabled = true;
    downloadPdfBtn.disabled = true;

    // Retrieve the captured image chunks from storage
    chrome.storage.local.get('capturedChunks', async (result) => {
        chunks = result.capturedChunks;
        if (!chunks || chunks.length === 0) {
            console.error("No screenshot data found.");
            loader.classList.add('hidden');
            alert("Could not retrieve screenshot data. Please try again.");
            return;
        }

        const imagePromises = chunks.map(dataUrl => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = dataUrl;
            });
        });

        try {
            images = await Promise.all(imagePromises);

            // Set canvas dimensions for full image
            const totalHeight = images.reduce((sum, img) => sum + img.height, 0);
            const maxWidth = Math.max(...images.map(img => img.width));
            canvas.width = maxWidth;
            canvas.height = totalHeight;

            // Draw each image chunk onto the canvas
            let y = 0;
            images.forEach(img => {
                ctx.drawImage(img, 0, y);
                y += img.height;
            });

            // Render the stitched image to the preview box
            const stitchedDataUrl = canvas.toDataURL('image/png');
            stitchedImage.src = stitchedDataUrl;

            // Clean up the storage
            chrome.storage.local.remove('capturedChunks');

            // Hide loader and enable download buttons
            loader.classList.add('hidden');
            downloadBtn.disabled = false;
            downloadPdfBtn.disabled = false;

        } catch (error) {
            console.error("Error processing images:", error);
            alert("An error occurred while creating the final image.");
            loader.classList.add('hidden');
        }
    });

    // Handle download full image button click
    downloadBtn.addEventListener('click', () => {
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        const date = new Date();
        const timestamp = date.toISOString().replace(/[:.]/g, '-');
        link.download = `screenshot-${timestamp}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Handle download PDF button click
    downloadPdfBtn.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
        const date = new Date();
        const timestamp = date.toISOString().replace(/[:.]/g, '-');
        pdf.save(`screenshot-${timestamp}.pdf`);
    });

    // --- Zoom and Pan for stitchedImage ---
    let scale = 1;
    let originX = 0;
    let originY = 0;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    // Zoom with Ctrl+scroll anywhere on the page
    window.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            scale = Math.min(Math.max(0.2, scale + delta), 5);
            stitchedImage.style.transform = `scale(${scale}) translate(${originX}px, ${originY}px)`;
        }
    }, { passive: false });

    // Pan only when dragging the image
    stitchedImage.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        stitchedImage.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        originX += (e.clientX - lastX) / scale;
        originY += (e.clientY - lastY) / scale;
        lastX = e.clientX;
        lastY = e.clientY;
        stitchedImage.style.transform = `scale(${scale}) translate(${originX}px, ${originY}px)`;
    });
    window.addEventListener('mouseup', () => {
        isDragging = false;
        stitchedImage.style.cursor = 'grab';
    });
    // Reset zoom/pan on double click
    stitchedImage.addEventListener('dblclick', () => {
        scale = 1;
        originX = 0;
        originY = 0;
        stitchedImage.style.transform = '';
    });
});
