console.log("--------------------------------");
console.log("Made with ❤️ by Abhishek :)");
console.log("--------------------------------");
console.log("\n✅ Content script loaded!");

(function () {
  let lastEnterTime = 0;
  const ENTER_THRESHOLD = 400; // milliseconds
  let currentPopup = null;
  let stylesInjected = false;

  // CSS styles with only dark theme
  const CSS_STYLES = `
    /* Overlay that covers the entire screen */
    .chatgpt-confirm-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999999;
    animation: fadeIn 0.2s ease-out;
  }

  /* ============ DARK THEME ONLY ============ */
  .chatgpt-confirm-popup {
    background: #2f2f2f;
    border: 1px solid #4a4a4a;
    border-radius: 12px;
    max-width: 480px;
    width: 90%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    font-family: Arial, sans-serif;
    animation: slideIn 0.2s ease-out;
    color: #ececec;
  }

  .chatgpt-confirm-header {
    padding: 20px 20px 0 20px;
  }

  .chatgpt-confirm-title {
    color: #ececec;
    font-size: 18px;
    font-weight: bold;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .chatgpt-confirm-content {
    padding: 15px 20px 20px 20px;
    color: #c5c5c5;
  }

  .chatgpt-confirm-message {
    font-size: 14px;
    margin: 0 0 15px 0;
    color: #c5c5c5;
  }

  .chatgpt-confirm-preview {
    background: #1a1a1a;
    border: 1px solid #404040;
    border-radius: 8px;
    padding: 12px;
    margin: 15px 0;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 13px;
    min-height: 40px;
    max-height: 200px;
    overflow-y: auto;
    color: #ececec;
    white-space: pre-wrap !important;
    word-break: break-word;
    line-height: 1.5;
    overflow-wrap: break-word;
  }

  .chatgpt-confirm-tip {
    /* border-radius: 8px; */
    padding: 12px;
    font-size: 12px;
    margin-top: 5px;
    color: #c5c5c5;
    line-height: 1.75;
    /* background: #1a1a1a; */
    /* border: 1px solid #404040; */
  }

  .chatgpt-confirm-tip code {
    background-color: #404040;
    padding: 2px 4px;
    border-radius: 4px;
    font-family: monospace;
    color: #ff6b9d;
  }

  .chatgpt-confirm-button {
    min-width: 80px;
    padding: 10px 16px;
    border: 1px solid #4a4a4a;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    font-family: Arial, sans-serif;
    transition: all 0.2s ease;
    background: #2f2f2f;
    color: #ececec;
  }

  .chatgpt-confirm-button:hover {
    background: #404040;
    border-color: #5a5a5a;
  }

  .chatgpt-confirm-send {
    background: #1a1a1a;
    color: white;
    border-color: #4a4a4a;
    font-weight: bold;
  }

  .chatgpt-confirm-send:hover {
    background: #000000;
    border-color: #4a4a4a;
  }

  .chatgpt-confirm-cancel {
    background: #2f2f2f;
    color: #ececec;
    border-color: #4a4a4a;
  }

  .chatgpt-confirm-cancel:hover {
    background: #404040;
  }

  /* ============ SHARED STYLES ============ */
  .chatgpt-confirm-buttons {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    flex-direction: row-reverse;
  }

  .chatgpt-confirm-button:active {
    transform: scale(0.98);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Scrollbar for preview */
  .chatgpt-confirm-preview::-webkit-scrollbar {
    width: 6px;
  }

  .chatgpt-confirm-preview::-webkit-scrollbar-track {
    background: #1a1a1a;
  }

  .chatgpt-confirm-preview::-webkit-scrollbar-thumb {
    background: #555555;
    border-radius: 3px;
  }

  .chatgpt-confirm-preview::-webkit-scrollbar-thumb:hover {
    background: #666666;
  }
  .chatgpt-confirm-preview::-webkit-scrollbar-thumb:active {
    background: #777777;
  }
  .chatgpt-confirm-preview::-webkit-scrollbar-corner {
    background: transparent;
  }

  `;

  // HTML template
  const HTML_TEMPLATE = `
    <div class="chatgpt-confirm-popup">
      <div class="chatgpt-confirm-header">
        <h3 class="chatgpt-confirm-title">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Prompt Confirm
        </h3>
      </div>
      <div class="chatgpt-confirm-content">
        <p class="chatgpt-confirm-message">
          Review your prompt before sending it to ChatGPT.
        </p>
        <div class="chatgpt-confirm-preview">{{PREVIEW_TEXT}}</div>
        <div class="chatgpt-confirm-tip">
          <strong>Tip:</strong> Press Enter twice quickly to send without
          confirmation, or <code>Shift+Enter</code> for line breaks. Press
          <code>Esc</code> to return to prompt input.
        </div>
        <div class="chatgpt-confirm-buttons">
          <button
            class="chatgpt-confirm-button chatgpt-confirm-send"
            data-action="send"
          >
            Send Prompt
          </button>
          <button
            class="chatgpt-confirm-button chatgpt-confirm-cancel"
            data-action="cancel"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;

  // Inject CSS styles
  function injectStyles() {
    if (stylesInjected) return;

    const style = document.createElement("style");
    style.id = "chatgpt-confirm-styles";
    style.textContent = CSS_STYLES;
    document.head.appendChild(style);
    stylesInjected = true;
  }

  function findInputArea() {
    // More specific selectors for ChatGPT input areas
    const selectors = [
      'textarea[placeholder*="Message"]',
      'div[contenteditable="true"]',
      "textarea",
      'div[role="textbox"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  function findSubmitButton() {
    // More specific selectors for ChatGPT submit button
    const selectors = [
      'button[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      'button svg[data-icon="send"]',
      'button[type="submit"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && !element.disabled) return element;
    }
    return null;
  }

  function showCustomConfirmation(text) {
    // Inject styles if not already done
    injectStyles();

    return new Promise((resolve) => {
      // Remove any existing popup
      if (currentPopup) {
        currentPopup.remove();
      }

      // Create popup HTML
      const overlay = document.createElement("div");
      overlay.className = "chatgpt-confirm-overlay";

      // Preserve line breaks in preview text
      const preview = text; // Show full text, let CSS handle the height with scrolling

      // For white-space: pre-wrap, we should preserve actual newlines, not convert to <br>
      // Just escape HTML characters but keep newlines as \n
      const escapedPreview = preview
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
      // Don't convert \n to <br> - let CSS pre-wrap handle it

      const popupHTML = HTML_TEMPLATE.replace(
        "{{PREVIEW_TEXT}}",
        escapedPreview
      );

      overlay.innerHTML = popupHTML;

      // Add event listeners
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          // Clicked outside popup
          resolve(false);
          overlay.remove();
          currentPopup = null;
        }
      });

      const buttons = overlay.querySelectorAll(".chatgpt-confirm-button");
      buttons.forEach((button) => {
        button.addEventListener("click", (e) => {
          const action = e.target.dataset.action;
          resolve(action === "send");
          overlay.remove();
          currentPopup = null;
        });
      });

      // Handle Escape key
      const handleEscape = (e) => {
        if (e.key === "Escape") {
          resolve(false);
          overlay.remove();
          currentPopup = null;
          document.removeEventListener("keydown", handleEscape);
        }
      };
      document.addEventListener("keydown", handleEscape);

      // Add to DOM
      document.body.appendChild(overlay);
      currentPopup = overlay;

      // Focus the send button by default
      setTimeout(() => {
        const sendButton = overlay.querySelector(".chatgpt-confirm-send");
        if (sendButton) {
          sendButton.focus();
        }
      }, 100);
    });
  }

  function onKeyDown(e) {
    if (e.key !== "Enter") return;

    // Don't interfere if Shift+Enter (new line)
    if (e.shiftKey) return;

    // Don't interfere if Ctrl+Enter or Alt+Enter
    if (e.ctrlKey || e.altKey) return;

    const now = Date.now();
    const isDoubleEnter = now - lastEnterTime < ENTER_THRESHOLD;
    lastEnterTime = now;

    if (isDoubleEnter) {
      // Allow double Enter to submit
      console.log("🚀 Double Enter detected. Submitting...");
      return;
    }

    // CRITICAL: Prevent the default action IMMEDIATELY and STOP all propagation
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Get the current text content
    const input = findInputArea();
    let text = "";

    if (input) {
      console.log("Input element type:", input.tagName, input.contentEditable);

      if (input.value !== undefined) {
        // For textarea and input elements
        text = input.value;
        console.log("Using input.value:", text);
      } else if (
        input.contentEditable === "true" ||
        input.getAttribute("contenteditable") === "true"
      ) {
        // For contenteditable elements (ChatGPT's input)
        // Use innerText which preserves line breaks better than innerHTML parsing
        text = input.innerText || input.textContent || "";
        console.log(
          "Using innerText for contenteditable:",
          JSON.stringify(text)
        );

        // Clean up the text - ChatGPT's innerText adds double newlines between paragraphs
        // Convert double newlines to single newlines to match the visual appearance
        text = text.replace(/\n\n+/g, "\n");
        console.log("After cleaning double newlines:", JSON.stringify(text));

        // If innerText doesn't work well, try manual HTML parsing
        if (!text || !text.includes("\n")) {
          let htmlContent = input.innerHTML;
          console.log("HTML content:", htmlContent);
          text = htmlContent
            .replace(/<br\s*\/?>/gi, "\n") // Convert <br> tags to newlines
            .replace(/<\/p>\s*<p[^>]*>/gi, "\n") // Convert </p><p> to single newlines
            .replace(/<\/div>\s*<div[^>]*>/gi, "\n") // Convert </div><div> to single newlines
            .replace(/<div[^>]*>/gi, "") // Remove opening <div> tags
            .replace(/<\/div>/gi, "") // Remove closing </div> tags (don't convert to \n)
            .replace(/<p[^>]*>/gi, "") // Remove opening <p> tags
            .replace(/<\/p>/gi, "") // Remove closing </p> tags (don't convert to \n)
            .replace(/<[^>]*>/g, "") // Remove any other HTML tags
            .replace(/&nbsp;/g, " ") // Convert &nbsp; to spaces
            .replace(/&amp;/g, "&") // Convert &amp; back to &
            .replace(/&lt;/g, "<") // Convert &lt; back to <
            .replace(/&gt;/g, ">") // Convert &gt; back to >
            .replace(/\n+/g, "\n") // Replace multiple consecutive newlines with single newline
            .trim();
          console.log("Parsed from HTML:", JSON.stringify(text));
        }
      } else if (input.textContent !== undefined) {
        // For other elements - fallback to textContent
        text = input.textContent;
        console.log("Using textContent:", text);
      } else if (input.innerText !== undefined) {
        // Final fallback to innerText
        text = input.innerText;
        console.log("Using innerText fallback:", text);
      }
    }

    console.log("Final extracted text:", JSON.stringify(text));

    // Show custom confirmation dialog
    showCustomConfirmation(text)
      .then((confirmed) => {
        if (confirmed) {
          const submitButton = findSubmitButton();
          if (submitButton) {
            console.log("✅ Confirmed. Clicking submit.");
            submitButton.click();
          } else {
            console.log("❌ Submit button not found.");
            // Fallback: try to submit the form
            const form = input?.closest("form");
            if (form) {
              form.submit();
            }
          }
        } else {
          console.log("❌ Submission cancelled. Returning to input.");
          // Ensure focus returns to the input field
          if (input) {
            input.focus();
            // Move cursor to end of text
            if (input.setSelectionRange && input.value) {
              input.setSelectionRange(input.value.length, input.value.length);
            } else if (input.textContent) {
              // For contenteditable elements
              const range = document.createRange();
              const selection = window.getSelection();
              range.selectNodeContents(input);
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
      })
      .catch((error) => {
        console.error("Error showing confirmation:", error);
        // Fallback to default confirm
        const confirmed = confirm("Do you want to submit this prompt?");
        if (confirmed) {
          const submitButton = findSubmitButton();
          if (submitButton) {
            submitButton.click();
          }
        }
      });

    // Return false as additional prevention
    return false;
  }

  function attachToInput(input) {
    if (!input || input.dataset.extensionAttached) return;

    // Remove any existing listeners first
    input.removeEventListener("keydown", onKeyDown, true);
    input.removeEventListener("keydown", onKeyDown, false);

    // Add listener in capture phase (higher priority) and bubbling phase
    input.addEventListener("keydown", onKeyDown, true); // Capture phase
    input.addEventListener("keydown", onKeyDown, false); // Bubbling phase

    input.dataset.extensionAttached = "true";
    console.log("🎯 Event listener attached to input element (both phases)");
  }

  function initializeExtension() {
    // Inject styles
    injectStyles();

    const input = findInputArea();
    if (input && !input.dataset.extensionAttached) {
      attachToInput(input);
      console.log("🔧 Extension initialized successfully");
    }
  }

  // Use MutationObserver to detect changes in the DOM
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;

    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        shouldCheck = true;
      }
    });

    if (shouldCheck) {
      setTimeout(initializeExtension, 100); // Small delay to ensure DOM is ready
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
  });

  // Initial setup
  setTimeout(initializeExtension, 500); // Wait for page to load

  // Also try to initialize when page becomes visible
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      setTimeout(initializeExtension, 100);
    }
  });
})();
