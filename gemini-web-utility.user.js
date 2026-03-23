// ==UserScript==
// @name         Gemini Web Utility
// @namespace    https://github.com/Setmaster/gemini-web-utility
// @version      0.1.0
// @description  Utilities for the Gemini web app, starting with clean copy for Gemini responses.
// @match        https://gemini.google.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const RESPONSE_CONTAINER_SELECTOR = '.response-container';
  const CONTENT_ROOT_SELECTOR = [
    '[inline-copy-host]',
    '.markdown',
    '[id^="model-response-message-content"]',
    '[data-test-id="model-response-message-content"]',
  ].join(', ');
  const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, [role="heading"]';

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function sanitizeLeadingResponseLabel(text, label) {
    if (!text || !label) {
      return text;
    }

    const escapedLabel = escapeRegExp(label.trim());
    const patterns = [
      new RegExp(`^\\s*${escapedLabel}(?:\\s*\\r?\\n\\s*)+`),
      new RegExp(`^\\s*${escapedLabel}\\s+`),
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return text.replace(pattern, '');
      }
    }

    return text;
  }

  function getRangeContainerElement(range) {
    const node = range.commonAncestorContainer;

    if (!node) {
      return null;
    }

    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  }

  function getResponseContainerForSelection(selection) {
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const container = getRangeContainerElement(selection.getRangeAt(0));
    return container?.closest(RESPONSE_CONTAINER_SELECTOR) ?? null;
  }

  function getResponseLabel(root) {
    if (!root) {
      return null;
    }

    const contentRoot = root.querySelector(CONTENT_ROOT_SELECTOR);
    const headings = root.querySelectorAll(HEADING_SELECTOR);

    for (const heading of headings) {
      if (contentRoot && contentRoot.contains(heading)) {
        continue;
      }

      const label = heading.textContent?.trim();
      if (label) {
        return label;
      }
    }

    return null;
  }

  function buildSanitizedSelectionHtml(range, label) {
    if (!range || !label || typeof document === 'undefined') {
      return null;
    }

    const wrapper = document.createElement('div');
    wrapper.append(range.cloneContents());

    const headings = wrapper.querySelectorAll(HEADING_SELECTOR);
    for (const heading of headings) {
      if (heading.closest(CONTENT_ROOT_SELECTOR)) {
        continue;
      }

      if (heading.textContent?.trim() === label) {
        heading.remove();
      }
    }

    const html = wrapper.innerHTML.trim();
    return html || null;
  }

  function handleCopy(event) {
    if (!event.clipboardData) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return;
    }

    const responseContainer = getResponseContainerForSelection(selection);
    if (!responseContainer) {
      return;
    }

    const label = getResponseLabel(responseContainer);
    if (!label) {
      return;
    }

    const selectedText = selection.toString();
    if (!selectedText) {
      return;
    }

    const sanitizedText = sanitizeLeadingResponseLabel(selectedText, label);
    if (sanitizedText === selectedText) {
      return;
    }

    const html = buildSanitizedSelectionHtml(selection.getRangeAt(0), label);

    event.preventDefault();
    event.stopImmediatePropagation();
    event.clipboardData.setData('text/plain', sanitizedText);

    if (html) {
      event.clipboardData.setData('text/html', html);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      sanitizeLeadingResponseLabel,
    };
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  document.addEventListener('copy', handleCopy, true);
})();
