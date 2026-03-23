const test = require('node:test');
const assert = require('node:assert/strict');

const {
  sanitizeLeadingResponseLabel,
  sanitizeSettings,
  parseShortcutDefinition,
  matchShortcutEvent,
  convertHtmlTreeToMarkdown,
  buildResponseMarkdown,
  extractCodeTextFromBlock,
  classifyGeminiAssetPath,
  classifyGeminiAssetUrl,
  normalizeGoogleusercontentImageUrl,
  resolveCandidateImageUrl,
  detectWatermarkConfig,
  calculateWatermarkPosition,
  getEmbeddedAlphaMap,
  processWatermarkImageData,
  hasProcessedImageApplied
} = require('../gemini-web-utility.user.js');

function textNode(text) {
  return {
    nodeType: 3,
    textContent: text,
    cloneNode() {
      return textNode(text);
    }
  };
}

function matchesSimpleSelector(node, selector) {
  if (!node || node.nodeType !== 1) {
    return false;
  }

  if (selector.startsWith('.')) {
    const className = (node.className || '').split(/\s+/).filter(Boolean);
    return className.includes(selector.slice(1));
  }

  if (selector.startsWith('[') && selector.endsWith(']')) {
    const attrName = selector.slice(1, -1).split('=')[0];
    return Boolean(node.getAttribute(attrName));
  }

  return node.tagName.toLowerCase() === selector.toLowerCase();
}

function querySelectorAllFrom(node, selector) {
  const selectors = selector.split(',').map((part) => part.trim()).filter(Boolean);
  const results = [];

  function visit(current) {
    if (!current || current.nodeType !== 1) {
      return;
    }

    for (const rawSelector of selectors) {
      const parts = rawSelector.split(/\s+/).filter(Boolean);
      if (parts.length === 1 && matchesSimpleSelector(current, parts[0])) {
        results.push(current);
        break;
      }

      if (parts.length === 2 && matchesSimpleSelector(current, parts[1])) {
        let parent = current.parentNode || null;
        while (parent) {
          if (matchesSimpleSelector(parent, parts[0])) {
            results.push(current);
            break;
          }
          parent = parent.parentNode || null;
        }
      }
    }

    for (const child of current.childNodes || []) {
      if (child && child.nodeType === 1) {
        child.parentNode = current;
      }
      visit(child);
    }
  }

  for (const child of node.childNodes || []) {
    if (child && child.nodeType === 1) {
      child.parentNode = node;
    }
    visit(child);
  }

  return results;
}

function elementNode(tagName, options, children) {
  const config = options || {};
  const childNodes = children || [];
  const attributes = Object.assign({}, config.attributes);
  const className = config.className || attributes.class || '';
  const node = {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    childNodes,
    textContent: childNodes.map((child) => child.textContent || '').join(''),
    innerHTML: config.innerHTML || '',
    className,
    attributes,
    getAttribute(name) {
      if (name === 'class') {
        return className;
      }
      return attributes[name] || '';
    },
    querySelector(selector) {
      return querySelectorAllFrom(node, selector)[0] || null;
    },
    querySelectorAll(selector) {
      return querySelectorAllFrom(node, selector);
    },
    remove() {
      if (!node.parentNode || !Array.isArray(node.parentNode.childNodes)) {
        return;
      }
      node.parentNode.childNodes = node.parentNode.childNodes.filter((child) => child !== node);
      node.parentNode.textContent = node.parentNode.childNodes.map((child) => child.textContent || '').join('');
    },
    cloneNode(deep) {
      if (!deep) {
        return elementNode(tagName, options, []);
      }
      return elementNode(
        tagName,
        options,
        childNodes.map((child) => {
          if (child.nodeType === 3) {
            return textNode(child.textContent);
          }
          if (typeof child.cloneNode === 'function') {
            return child.cloneNode(true);
          }
          return child;
        })
      );
    }
  };

  return node;
}

function fragmentNode(children) {
  return {
    nodeType: 11,
    childNodes: children,
    textContent: children.map((child) => child.textContent || '').join('')
  };
}

function createSyntheticImageData(width, height) {
  const imageData = {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4)
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      imageData.data[index] = 70 + ((x * 23 + y * 5) % 90);
      imageData.data[index + 1] = 80 + ((x * 11 + y * 17) % 100);
      imageData.data[index + 2] = 90 + ((x * 7 + y * 13) % 80);
      imageData.data[index + 3] = 255;
    }
  }

  return imageData;
}

function overlaySyntheticWatermark(imageData, alphaGain = 1) {
  const config = detectWatermarkConfig(imageData.width, imageData.height);
  const position = calculateWatermarkPosition(imageData.width, imageData.height, config);
  const alphaMap = getEmbeddedAlphaMap(config.logoSize);

  for (let row = 0; row < position.height; row += 1) {
    for (let col = 0; col < position.width; col += 1) {
      const imageIndex = ((position.y + row) * imageData.width + (position.x + col)) * 4;
      const alphaIndex = row * position.width + col;
      const alpha = Math.min(alphaMap[alphaIndex] * alphaGain, 0.99);
      const oneMinusAlpha = 1 - alpha;

      for (let channel = 0; channel < 3; channel += 1) {
        const originalValue = imageData.data[imageIndex + channel];
        imageData.data[imageIndex + channel] = Math.max(
          0,
          Math.min(255, Math.round(originalValue * oneMinusAlpha + 255 * alpha))
        );
      }
    }
  }

  return { imageData, config, position };
}

test('removes Gemini heading when separated by blank lines', () => {
  assert.equal(
    sanitizeLeadingResponseLabel('Gemini said\n\nI like potatoes', 'Gemini said'),
    'I like potatoes'
  );
});

test('removes Gemini heading when flattened into one line', () => {
  assert.equal(
    sanitizeLeadingResponseLabel(' Gemini said I like potatoes', 'Gemini said'),
    'I like potatoes'
  );
});

test('keeps text unchanged when heading is absent', () => {
  assert.equal(
    sanitizeLeadingResponseLabel('I like potatoes', 'Gemini said'),
    'I like potatoes'
  );
});

test('sanitizes settings payloads against known defaults', () => {
  assert.deepEqual(
    sanitizeSettings({
      cleanCopy: false,
      copyAsMarkdown: true,
      shortcutSubmit: 'Shift+Enter',
      unknownSetting: false
    }),
    {
      cleanCopy: false,
      copyAsMarkdown: true,
      codeBlockCopyFix: true,
      watermarkRemoval: true,
      keyboardShortcutsEnabled: true,
      shortcutNewChat: 'Ctrl+Shift+N',
      shortcutSubmit: 'Shift+Enter',
      shortcutStop: 'Escape'
    }
  );
});

test('parses configurable keyboard shortcuts', () => {
  assert.deepEqual(parseShortcutDefinition('Ctrl+Shift+N'), {
    ctrl: true,
    alt: false,
    shift: true,
    meta: false,
    key: 'N'
  });

  assert.deepEqual(parseShortcutDefinition('Escape'), {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    key: 'Escape'
  });
});

test('matches keyboard events against shortcut definitions', () => {
  assert.equal(
    matchShortcutEvent(
      { key: 'Enter', ctrlKey: true, altKey: false, shiftKey: false, metaKey: false },
      parseShortcutDefinition('Ctrl+Enter')
    ),
    true
  );

  assert.equal(
    matchShortcutEvent(
      { key: 'Enter', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
      parseShortcutDefinition('Ctrl+Enter')
    ),
    false
  );
});

test('does not strip later occurrences of the label', () => {
  assert.equal(
    sanitizeLeadingResponseLabel('I like when Gemini said useful things', 'Gemini said'),
    'I like when Gemini said useful things'
  );
});

test('classifies Gemini asset paths and download variants', () => {
  assert.deepEqual(classifyGeminiAssetPath('/gg/example=s512'), {
    family: 'gg',
    variant: '',
    isPreview: true,
    isDownload: false
  });
  assert.deepEqual(classifyGeminiAssetPath('/gg-hires-dl/example=s512'), {
    family: 'gg',
    variant: 'hires',
    isPreview: false,
    isDownload: true
  });
  assert.deepEqual(classifyGeminiAssetPath('/rd-special/example=s512'), {
    family: 'rd',
    variant: 'special',
    isPreview: false,
    isDownload: false
  });
});

test('classifies Gemini asset URLs on googleusercontent hosts only', () => {
  assert.equal(
    classifyGeminiAssetUrl('https://example.com/gg/foo=w1024-h1024'),
    null
  );
  assert.deepEqual(
    classifyGeminiAssetUrl('https://lh3.googleusercontent.com/gg-hires/foo=w1024-h1024?x=1'),
    {
      family: 'gg',
      variant: 'hires',
      isPreview: true,
      isDownload: false
    }
  );
});

test('normalizes Gemini asset URLs to original-size fetches', () => {
  assert.equal(
    normalizeGoogleusercontentImageUrl('https://lh3.googleusercontent.com/gg/foo=w1024-h1024'),
    'https://lh3.googleusercontent.com/gg/foo=s0'
  );
  assert.equal(
    normalizeGoogleusercontentImageUrl('https://lh3.googleusercontent.com/rd-hires/foo=s512-c?bar=1'),
    'https://lh3.googleusercontent.com/rd-hires/foo=s0-c?bar=1'
  );
  assert.equal(
    normalizeGoogleusercontentImageUrl('https://example.com/not-gemini.png'),
    'https://example.com/not-gemini.png'
  );
});

test('converts common Gemini response markup to markdown', () => {
  const tree = fragmentNode([
    elementNode('h2', {}, [textNode('Title')]),
    elementNode('p', {}, [
      textNode('Hello '),
      elementNode('strong', {}, [textNode('world')]),
      textNode(' and '),
      elementNode('a', { attributes: { href: 'https://example.com' } }, [textNode('links')]),
      textNode('.')
    ]),
    elementNode('ul', {}, [
      elementNode('li', {}, [textNode('first')]),
      elementNode('li', {}, [textNode('second')])
    ]),
    elementNode('blockquote', {}, [
      elementNode('p', {}, [textNode('quoted text')])
    ]),
    elementNode('pre', {}, [
      elementNode('code', { className: 'language-js' }, [textNode("console.log('x');\n")])
    ])
  ]);

  assert.equal(
    convertHtmlTreeToMarkdown(tree),
    [
      '## Title',
      '',
      'Hello **world** and [links](https://example.com).',
      '',
      '- first',
      '- second',
      '',
      '> quoted text',
      '',
      '```js',
      "console.log('x');",
      '```'
    ].join('\n')
  );
});

test('renders simple tables as markdown tables', () => {
  const table = elementNode('table', {}, [
    elementNode('tr', {}, [
      elementNode('th', {}, [textNode('Name')]),
      elementNode('th', {}, [textNode('Value')])
    ]),
    elementNode('tr', {}, [
      elementNode('td', {}, [textNode('Alpha')]),
      elementNode('td', {}, [textNode('42')])
    ])
  ]);

  assert.equal(
    convertHtmlTreeToMarkdown(table),
    ['| Name | Value |', '| --- | --- |', '| Alpha | 42 |'].join('\n')
  );
});

test('builds full-response markdown from the Gemini content root', () => {
  const contentRoot = elementNode('div', {}, [
    elementNode('p', {}, [textNode('Line one')]),
    elementNode('p', {}, [textNode('Line two')])
  ]);
  const responseContainer = {
    querySelector(selector) {
      if (selector.includes('.markdown')) {
        return contentRoot;
      }
      return null;
    }
  };

  assert.equal(buildResponseMarkdown(responseContainer), 'Line one\n\nLine two');
});

test('extracts code text without line-number gutter nodes', () => {
  const codeBlock = elementNode('pre', {}, [
    elementNode('code', {}, [
      elementNode('span', { className: 'line-number' }, [textNode('1')]),
      textNode('const one = 1;\n'),
      elementNode('span', { className: 'line-number' }, [textNode('2')]),
      textNode('const two = 2;')
    ])
  ]);

  assert.equal(
    extractCodeTextFromBlock(codeBlock),
    "const one = 1;\nconst two = 2;"
  );
});

test('strips textual line-number prefixes when most lines match the pattern', () => {
  const codeBlock = elementNode('pre', {}, [
    textNode('1  const one = 1;\n2  const two = 2;')
  ]);

  assert.equal(
    extractCodeTextFromBlock(codeBlock),
    "const one = 1;\nconst two = 2;"
  );
});

test('resolves explicit and stable candidate image URLs', () => {
  assert.equal(
    resolveCandidateImageUrl({
      dataset: {
        gwuSourceUrl: 'https://lh3.googleusercontent.com/gg/explicit=s0'
      },
      currentSrc: 'blob:https://gemini.google.com/example',
      src: 'blob:https://gemini.google.com/example'
    }),
    'https://lh3.googleusercontent.com/gg/explicit=s0'
  );

  assert.equal(
    resolveCandidateImageUrl({
      dataset: {
        gwuStableSource: 'https://lh3.googleusercontent.com/gg/stable=s0'
      },
      currentSrc: 'blob:https://gemini.google.com/example',
      src: 'blob:https://gemini.google.com/example'
    }),
    'https://lh3.googleusercontent.com/gg/stable=s0'
  );
});

test('treats a processed image as applied only while the blob URL is still active', () => {
  const sourceUrl = 'https://lh3.googleusercontent.com/gg/foo=s0';
  const blobUrl = 'blob:https://gemini.google.com/example';

  assert.equal(
    hasProcessedImageApplied(
      {
        src: blobUrl,
        currentSrc: blobUrl,
        dataset: {
          gwuImageSource: sourceUrl,
          gwuImageState: 'ready',
          gwuObjectUrl: blobUrl
        }
      },
      sourceUrl
    ),
    true
  );

  assert.equal(
    hasProcessedImageApplied(
      {
        src: sourceUrl,
        currentSrc: sourceUrl,
        dataset: {
          gwuImageSource: sourceUrl,
          gwuImageState: 'ready',
          gwuObjectUrl: blobUrl
        }
      },
      sourceUrl
    ),
    false
  );
});

test('detects no watermark on a synthetic clean image', () => {
  const cleanImage = createSyntheticImageData(1536, 1536);
  const result = processWatermarkImageData(cleanImage);

  assert.equal(result.applied, false);
  assert.equal(result.meta.applied, false);
});

test('removes a synthetic 96px watermark and reduces residual scores', () => {
  const watermarked = overlaySyntheticWatermark(createSyntheticImageData(1536, 1536));
  const result = processWatermarkImageData(watermarked.imageData);

  assert.equal(result.applied, true);
  assert.equal(result.meta.applied, true);
  assert.equal(result.meta.size, 96);
  assert.ok(result.meta.detectionScore > 0.5);
  assert.ok(result.meta.processedSpatialScore < result.meta.originalSpatialScore);
  assert.ok(result.meta.processedGradientScore < result.meta.originalGradientScore);
  assert.ok(result.meta.processedSpatialScore < 0.1);
});

test('removes a synthetic 48px watermark on smaller images', () => {
  const watermarked = overlaySyntheticWatermark(createSyntheticImageData(1024, 1024));
  const result = processWatermarkImageData(watermarked.imageData);

  assert.equal(result.applied, true);
  assert.equal(result.meta.applied, true);
  assert.equal(result.meta.size, 48);
  assert.ok(result.meta.processedSpatialScore < 0.1);
});
