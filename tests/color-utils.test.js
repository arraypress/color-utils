import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateInitialsAvatar,
  hexToRgb,
  rgbToHex,
  luminance,
  isLight,
  isDark,
  contrastText,
  lighten,
  darken,
  mix,
  withAlpha,
} from '../src/index.js';

describe('hexToRgb', () => {
  it('parses 6-digit hex', () => {
    assert.deepEqual(hexToRgb('#ff0000'), { r: 255, g: 0, b: 0 });
    assert.deepEqual(hexToRgb('#00ff00'), { r: 0, g: 255, b: 0 });
    assert.deepEqual(hexToRgb('#0000ff'), { r: 0, g: 0, b: 255 });
  });

  it('parses 3-digit hex', () => {
    assert.deepEqual(hexToRgb('#fff'), { r: 255, g: 255, b: 255 });
    assert.deepEqual(hexToRgb('#000'), { r: 0, g: 0, b: 0 });
    assert.deepEqual(hexToRgb('#f00'), { r: 255, g: 0, b: 0 });
  });

  it('works without # prefix', () => {
    assert.deepEqual(hexToRgb('ff0000'), { r: 255, g: 0, b: 0 });
    assert.deepEqual(hexToRgb('fff'), { r: 255, g: 255, b: 255 });
  });

  it('handles uppercase', () => {
    assert.deepEqual(hexToRgb('#FF0000'), { r: 255, g: 0, b: 0 });
    assert.deepEqual(hexToRgb('#AABBCC'), { r: 170, g: 187, b: 204 });
  });

  it('parses pure black and white', () => {
    assert.deepEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
    assert.deepEqual(hexToRgb('#ffffff'), { r: 255, g: 255, b: 255 });
  });
});

describe('rgbToHex', () => {
  it('converts RGB to hex', () => {
    assert.equal(rgbToHex(255, 0, 0), '#ff0000');
    assert.equal(rgbToHex(0, 255, 0), '#00ff00');
    assert.equal(rgbToHex(0, 0, 255), '#0000ff');
    assert.equal(rgbToHex(255, 255, 255), '#ffffff');
    assert.equal(rgbToHex(0, 0, 0), '#000000');
  });

  it('clamps values to 0-255', () => {
    assert.equal(rgbToHex(300, -10, 128), '#ff0080');
  });

  it('rounds fractional values', () => {
    assert.equal(rgbToHex(127.6, 0, 0), '#800000');
  });
});

describe('luminance', () => {
  it('returns 0 for black', () => {
    assert.equal(luminance('#000000'), 0);
  });

  it('returns 255 for white', () => {
    assert.equal(luminance('#ffffff'), 255);
  });

  it('returns intermediate value for grey', () => {
    const lum = luminance('#808080');
    assert.ok(lum > 100 && lum < 150);
  });
});

describe('isLight / isDark', () => {
  it('white is light', () => {
    assert.equal(isLight('#ffffff'), true);
    assert.equal(isDark('#ffffff'), false);
  });

  it('black is dark', () => {
    assert.equal(isLight('#000000'), false);
    assert.equal(isDark('#000000'), true);
  });

  it('yellow is light', () => {
    assert.equal(isLight('#ffff00'), true);
  });

  it('dark blue is dark', () => {
    assert.equal(isDark('#000080'), true);
  });

  it('respects custom threshold', () => {
    const grey = '#808080';
    assert.equal(isLight(grey, 50), true);
    assert.equal(isLight(grey, 200), false);
  });
});

describe('contrastText', () => {
  it('returns dark text for light backgrounds', () => {
    assert.equal(contrastText('#ffffff'), '#000000');
    assert.equal(contrastText('#ffff00'), '#000000');
  });

  it('returns light text for dark backgrounds', () => {
    assert.equal(contrastText('#000000'), '#ffffff');
    assert.equal(contrastText('#000080'), '#ffffff');
  });

  it('accepts custom colors', () => {
    assert.equal(contrastText('#ffffff', '#eeeeee', '#111111'), '#111111');
    assert.equal(contrastText('#000000', '#eeeeee', '#111111'), '#eeeeee');
  });
});

describe('lighten / darken', () => {
  it('lightens a color', () => {
    const result = lighten('#800000', 20);
    const rgb = hexToRgb(result);
    assert.equal(rgb.r, 148);
    assert.equal(rgb.g, 20);
    assert.equal(rgb.b, 20);
  });

  it('darkens a color', () => {
    const result = darken('#ffffff', 20);
    const rgb = hexToRgb(result);
    assert.equal(rgb.r, 235);
    assert.equal(rgb.g, 235);
    assert.equal(rgb.b, 235);
  });

  it('clamps when lightening past white', () => {
    const result = lighten('#ffffff', 50);
    assert.equal(result, '#ffffff');
  });

  it('clamps when darkening past black', () => {
    const result = darken('#000000', 50);
    assert.equal(result, '#000000');
  });
});

describe('mix', () => {
  it('mixes black and white at 50%', () => {
    const result = mix('#000000', '#ffffff', 0.5);
    const rgb = hexToRgb(result);
    assert.equal(rgb.r, 128);
    assert.equal(rgb.g, 128);
    assert.equal(rgb.b, 128);
  });

  it('ratio 0 returns first color', () => {
    assert.equal(mix('#ff0000', '#0000ff', 0), '#ff0000');
  });

  it('ratio 1 returns second color', () => {
    assert.equal(mix('#ff0000', '#0000ff', 1), '#0000ff');
  });

  it('mixes two colors at 25%', () => {
    const result = mix('#ff0000', '#0000ff', 0.25);
    const rgb = hexToRgb(result);
    assert.equal(rgb.r, 191);
    assert.equal(rgb.g, 0);
    assert.equal(rgb.b, 64);
  });
});

describe('withAlpha', () => {
  it('returns rgba string', () => {
    assert.equal(withAlpha('#ff0000', 0.5), 'rgba(255, 0, 0, 0.5)');
  });

  it('handles full opacity', () => {
    assert.equal(withAlpha('#000000', 1), 'rgba(0, 0, 0, 1)');
  });

  it('handles zero opacity', () => {
    assert.equal(withAlpha('#ffffff', 0), 'rgba(255, 255, 255, 0)');
  });

  it('works with 3-digit hex', () => {
    assert.equal(withAlpha('#f00', 0.75), 'rgba(255, 0, 0, 0.75)');
  });
});

// ── generateInitialsAvatar ──────────────────

describe('generateInitialsAvatar', () => {
  /**
   * Helper — decode the data-URL into its SVG markup so tests
   * can assert on the contents.
   */
  function decode(url) {
    assert.ok(url.startsWith('data:image/svg+xml;utf8,'), 'url is a data:image/svg+xml URL');
    return decodeURIComponent(url.slice('data:image/svg+xml;utf8,'.length));
  }

  it('returns a data:image/svg+xml URL', () => {
    const url = generateInitialsAvatar('DS');
    assert.ok(url.startsWith('data:image/svg+xml;utf8,'));
  });

  it('embeds the initials as the <text> content', () => {
    const url = generateInitialsAvatar('DS');
    const svg = decode(url);
    assert.ok(svg.includes('>DS</text>'));
  });

  it('defaults to 400×400 viewBox', () => {
    const svg = decode(generateInitialsAvatar('AB'));
    assert.ok(svg.includes('viewBox="0 0 400 400"'));
    assert.ok(svg.includes('width="400"'));
    assert.ok(svg.includes('height="400"'));
  });

  it('honours a custom size', () => {
    const svg = decode(generateInitialsAvatar('AB', { size: 128 }));
    assert.ok(svg.includes('viewBox="0 0 128 128"'));
  });

  it('uses larger font for 1–2 char monograms', () => {
    const svg = decode(generateInitialsAvatar('AB'));
    assert.ok(svg.includes('font-size="170"'));
  });

  it('uses smaller font for 3+ char monograms', () => {
    const svg = decode(generateInitialsAvatar('ABC'));
    assert.ok(svg.includes('font-size="130"'));
  });

  it('honours an explicit fontSize override', () => {
    const svg = decode(generateInitialsAvatar('AB', { fontSize: 60 }));
    assert.ok(svg.includes('font-size="60"'));
  });

  it('uses default bg/text/accent colours', () => {
    const svg = decode(generateInitialsAvatar('AB'));
    assert.ok(svg.includes('fill="#141414"'), 'default bg');
    assert.ok(svg.includes('fill="#8a8a8a"'), 'default text');
    assert.ok(svg.includes('rgba(255,242,0,0.08)'), 'default accent');
  });

  it('honours custom bg / text / accent', () => {
    const svg = decode(
      generateInitialsAvatar('AB', { bg: '#fff', text: '#000', accent: 'rgba(0,0,255,0.1)' }),
    );
    assert.ok(svg.includes('fill="#fff"'));
    assert.ok(svg.includes('fill="#000"'));
    assert.ok(svg.includes('rgba(0,0,255,0.1)'));
  });

  it('sets aria-label to initials by default', () => {
    const svg = decode(generateInitialsAvatar('DS'));
    assert.ok(svg.includes('aria-label="DS"'));
  });

  it('honours a custom aria-label', () => {
    const svg = decode(generateInitialsAvatar('DS', { label: 'David Sherlock' }));
    assert.ok(svg.includes('aria-label="David Sherlock"'));
  });

  it('escapes XML-significant chars in initials', () => {
    const svg = decode(generateInitialsAvatar('<&>'));
    assert.ok(svg.includes('&lt;&amp;&gt;'));
  });

  it('renders a placeholder dot when initials are empty', () => {
    const svg = decode(generateInitialsAvatar(''));
    assert.ok(svg.includes('>·</text>'));
    assert.ok(svg.includes('aria-label="Placeholder"'));
  });

  it('coerces non-string initials safely', () => {
    const svg = decode(generateInitialsAvatar(undefined));
    assert.ok(svg.includes('>·</text>'));
  });
});
