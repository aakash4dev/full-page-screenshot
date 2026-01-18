# Architecture Documentation

## Overview
Full Page Screenshot is a Chrome Extension that captures entire webpages by scrolling through them, taking screenshots of each visible portion, and stitching them together into a final image.

## Components

### 1. Popup (UI)
- **Files**: `popup.html`, `popup.js`, `styles/tailwind.min.css`
- **Role**: The main interface for the user.
- **Structure**: Single-page application within the popup using view-based navigation.
    - **Home**: Trigger capture.
    - **History**: View recent captures (stored in `chrome.storage.local`).
    - **Settings**: Configure delay and image format.
    - **About**: App info.
- **Communication**: Sends `captureFullPage` message to `background.js`.

### 2. Background Service Worker
- **Files**: `background.js`
- **Role**: Orchestrates the capture process and handles browser-level events.
- **Responsibilities**:
    - Listens for `captureFullPage` from Popup.
    - Injects `content.js` into the active tab.
    - Listens for `captureVisibleTab` requests from Content Script and executes `chrome.tabs.captureVisibleTab`.
    - Opens `review.html` upon completion.

### 3. Content Script
- **Files**: `content.js`
- **Role**: Manipulates the page to enable full capture.
- **Process**:
    1.  Hides scrollbars (injects CSS).
    2.  Calculates page dimensions.
    3.  Iterates:
        -   Scrolls to position.
        -   Waits for render.
        -   Requests screenshot from Background.
        -   Stores image chunk.
    4.  Saves all chunks to `chrome.storage.local`.
    5.  Restores scroll position and styles.

### 4. Review Page
- **Files**: `review.html`, `review.js`
- **Role**: Displays the final result and handles image processing.
- **Process**:
    -   Loads chunks from `chrome.storage.local`.
    -   Draws chunks onto an HTML5 Canvas to stitch them together.
    -   Converts Canvas to Data URL (PNG/JPG).
    -   Provides Download Image and Download PDF functionality (via `jspdf`).

## Data Flow

1.  **User** clicks "Capture" in Popup.
2.  **Popup** -> `sendMessage("captureFullPage")` -> **Background**.
3.  **Background** -> `executeScript("content.js")` -> **Tab**.
4.  **Content Script** -> `sendMessage("captureVisibleTab")` -> **Background** (repeatedly).
5.  **Background** -> Returns base64 image data -> **Content Script**.
6.  **Content Script** -> Saves `[chunk1, chunk2, ...]` to `chrome.storage.local`.
7.  **Content Script** -> `sendResponse("complete")` -> **Background**.
8.  **Background** -> `tabs.create("review.html")`.
9.  **Review Page** -> Reads `chrome.storage.local` -> Stitches Images -> Display.

## Technology Stack
-   **HTML5 / CSS3**: Tailwind CSS for styling.
-   **JavaScript (ES6+)**: Vanilla JS.
-   **Chrome Extensions API**: Manifest V3.
-   **Libraries**: `jspdf` for PDF generation.
