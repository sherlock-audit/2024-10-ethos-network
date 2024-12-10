export function initializeTestHoverPopups() {
  document.body.addEventListener('mouseover', (event) => {
    const target = event.target as HTMLElement;

    if (target.matches('.eth-address-hover-popup')) {
      let handle = target.getAttribute('data-handle');
      const address = target.textContent ?? '';

      // Remove '@' from the start of the handle, if present
      if (handle?.startsWith('@')) {
        handle = handle.slice(1);
      }

      const popup = createEthPopup(target, address, handle);
      document.body.appendChild(popup);
      setupEthPopupRemoval(target, popup);
    }
  });
}

function createEthPopup(target: HTMLElement, address: string, handle: string | null): HTMLElement {
  const popup = document.createElement('div');
  styleEthPopup(popup);
  positionEthPopup(popup, target);

  const credibilityButton = createEthButton('Get Credibility Score', '#4CAF50');
  const navigateButton = createEthButton('Navigate Profile', '#008CBA');

  setupEthNavigateButton(navigateButton, handle);
  setupEthCredibilityButton(credibilityButton, address, popup);

  appendEthPopupContent(popup, address, credibilityButton, navigateButton);

  return popup;
}

function styleEthPopup(popup: HTMLElement) {
  popup.className = 'eth-custom-popup';
  popup.style.cssText = `
        position: absolute; background-color: #333; border: 1px solid #777;
        padding: 15px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        color: #fff; font-size: 1em; display: flex; flex-direction: column;
        align-items: start; justify-content: center; gap: 10px;
    `;
}

function positionEthPopup(popup: HTMLElement, target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
  popup.style.left = `${rect.left + window.scrollX}px`;
}

function createEthButton(text: string, bgColor: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.innerText = text;
  button.style.cssText = `
        padding: 8px 16px; background-color: ${bgColor}; color: #fff;
        border: none; border-radius: 4px; cursor: pointer;
    `;

  return button;
}

function setupEthNavigateButton(button: HTMLButtonElement, handle: string | null) {
  button.addEventListener('click', () => {
    const message = {
      type: 'OPEN_TAB',
      address: handle,
    };
    chrome.runtime.sendMessage(message, function () {});
  });
}

function setupEthCredibilityButton(button: HTMLButtonElement, address: string, popup: HTMLElement) {
  button.addEventListener('click', () => {
    button.disabled = true;
    button.innerText = 'Loading...';

    const message = {
      type: 'FETCH_CREDIBILITY_SCORE',
      address,
    };

    chrome.runtime.sendMessage(message, (response) => {
      if (response?.success) {
        const contentDiv = popup.querySelector('div');

        if (contentDiv) {
          contentDiv.innerHTML = `Address: ${address}<br>Credibility Score: ${response.score}`;
        } else {
          console.error('Failed to find the content div in the popup');
        }
      } else {
        console.error('Error fetching credibility score');
      }

      setTimeout(() => {
        button.innerText = 'Get Credibility Score';
        button.disabled = false;
      }, 300);
    });
  });
}

function appendEthPopupContent(
  popup: HTMLElement,
  address: string,
  credibilityButton: HTMLElement,
  navigateButton: HTMLElement,
) {
  const contentDiv = document.createElement('div');
  contentDiv.innerText = `Address: ${address}`;
  popup.appendChild(contentDiv);
  popup.appendChild(document.createElement('br'));
  popup.appendChild(credibilityButton);
  popup.appendChild(navigateButton);
}

function setupEthPopupRemoval(target: HTMLElement, popup: HTMLElement) {
  let popupTimeout: NodeJS.Timeout;
  popup.addEventListener('mouseleave', () => {
    popupTimeout = setTimeout(() => {
      if (document.body.contains(popup)) {
        document.body.removeChild(popup);
      }
    }, 300);
  });

  popup.addEventListener('mouseenter', () => {
    clearTimeout(popupTimeout);
  });

  target.addEventListener('mouseleave', () => {
    popupTimeout = setTimeout(() => {
      if (document.body.contains(popup)) {
        document.body.removeChild(popup);
      }
    }, 300);
  });
}
