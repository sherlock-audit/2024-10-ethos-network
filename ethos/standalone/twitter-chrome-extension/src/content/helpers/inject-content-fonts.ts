export function injectContentFonts() {
  const style = document.createElement('style');
  const extensionID = chrome.runtime.id;
  style.innerHTML = `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
          @font-face {
              font-family: 'Queens';
              src: url('chrome-extension://${extensionID}/fonts/Queens_W-Regular.woff2');
          }
      `;
  document.head.appendChild(style);
}
