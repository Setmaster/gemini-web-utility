const test = require('node:test');
const assert = require('node:assert/strict');

const { sanitizeLeadingResponseLabel } = require('../gemini-web-utility.user.js');

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
