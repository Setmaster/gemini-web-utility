const test = require('node:test');
const assert = require('node:assert/strict');

const {
  sanitizeLeadingResponseLabel,
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
