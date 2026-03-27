'use strict';

function isAllowedFetchUrl(url) {
  try {
    const parsedUrl = new URL(String(url || ''));
    const hostname = parsedUrl.hostname.toLowerCase();

    if (
      parsedUrl.protocol === 'https:' &&
      (hostname.endsWith('googleusercontent.com') || hostname === 'lh3.google.com')
    ) {
      return true;
    }

  } catch {
    return false;
  }

  return false;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function fetchBlobPayload(url) {
  if (!isAllowedFetchUrl(url)) {
    throw new Error('Blocked fetch target');
  }

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Fetch failed: ' + response.status);
  }

  const contentType = response.headers.get('content-type') || '';
  const buffer = await response.arrayBuffer();
  return {
    ok: true,
    contentType,
    base64: arrayBufferToBase64(buffer)
  };
}

if (typeof chrome !== 'undefined' && chrome && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== 'object') {
      return false;
    }

    if (message.type === 'gwu-fetch-blob') {
      fetchBlobPayload(message.url)
        .then(sendResponse)
        .catch((error) => {
          sendResponse({
            ok: false,
            error: error && error.message ? error.message : String(error)
          });
        });
      return true;
    }

    return false;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isAllowedFetchUrl
  };
}
