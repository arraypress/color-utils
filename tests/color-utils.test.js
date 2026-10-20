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
  relativeLuminance,
  contrastRatio,
  readableText,
  readableOn,
  deriveAccent,
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

describe('relativeLuminance / contrastRatio / readableText (WCAG)', () => {
  it('gives 0 for black and 1 for white', () => {
    assert.equal(relativeLuminance('#000000'), 0);
    assert.equal(relativeLuminance('#ffffff'), 1);
  });

  it('gives 21 for black on white, 1 for a color on itself, either way round', () => {
    assert.equal(contrastRatio('#000000', '#ffffff'), 21);
    assert.equal(contrastRatio('#ffffff', '#000000'), 21);
    assert.equal(contrastRatio('#635bff', '#635bff'), 1);
    assert.ok(Math.abs(contrastRatio('#777777', '#ffffff') - 4.48) < 0.01);
  });

  it('picks the text with more contrast, crossing over near 0.179', () => {
    assert.equal(readableText('#635bff'), '#ffffff');
    assert.equal(readableText('#ffd60a'), '#000000');
    assert.equal(readableText('#000000'), '#ffffff');
    assert.equal(readableText('#ffffff'), '#000000');
    assert.equal(readableText('#635bff', '#fff', '#111'), '#fff');
  });
});

// The JournalGrid presets' surfaces (page, card, card-2) per mode.
const PRESETS = {
  paper: { light: ['#fdfdfd', '#f6f6f6', '#eeeeee'], dark: ['#1d1d1f', '#29292a', '#323234'] },
  journal: { light: ['#faf8f4', '#f3efe7', '#ebe5d9'], dark: ['#16130f', '#1f1b16', '#29241d'] },
  ink: { light: ['#ffffff', '#ffffff', '#f5f5f5'], dark: ['#0a0a0a', '#111111', '#1a1a1a'] },
  pulse: { light: ['#ffffff', '#f6f6f6', '#ececec'], dark: ['#1f1f1f', '#262626', '#303030'] },
  soft: { light: ['#f7f7f8', '#ffffff', '#eeeef0'], dark: ['#1c1c1e', '#252527', '#2f2f32'] },
};

const ACCENTS = {
  yellow: '#ffd400',
  navy: '#1e3a8a',
  blue: '#0039d5',
  red: '#9b1c1c',
  green: '#22c55e',
  pink: '#ec4899',
  white: '#ffffff',
  black: '#000000',
};

const passesAll = (hex, surfaces, ratio) => surfaces.every((s) => contrastRatio(hex, s) >= ratio);

/** The step (of 256) at which `shade` sits between `color` and `toward`. */
const stepOf = (color, toward, shade) => {
  for (let i = 0; i <= 256; i++) if (mix(color, toward, i / 256) === shade) return i;
  return -1;
};

describe('readableOn', () => {
  it('returns the color itself when it already clears the ratio', () => {
    assert.equal(readableOn('#0039d5', ['#fdfdfd', '#eeeeee']), '#0039d5');
    assert.equal(readableOn('#ffd400', ['#1d1d1f'], { toward: 'white' }), '#ffd400');
  });

  it('darkens a yellow a long way for a light page', () => {
    const shade = readableOn('#ffd400', PRESETS.paper.light, { toward: 'black' });
    assert.equal(shade, '#786300');
    assert.ok(passesAll(shade, PRESETS.paper.light, 5));
    assert.ok(stepOf('#ffd400', '#000000', shade) / 256 > 0.4);
  });

  it('lightens a navy for a dark page', () => {
    const shade = readableOn('#1e3a8a', PRESETS.paper.dark, { toward: 'white' });
    assert.ok(passesAll(shade, PRESETS.paper.dark, 5));
    assert.ok(relativeLuminance(shade) > relativeLuminance('#1e3a8a'));
  });

  it('returns the least-shifted shade: every step before it fails', () => {
    for (const [name, accent] of Object.entries(ACCENTS)) {
      for (const [mode, toward] of [['light', '#000000'], ['dark', '#ffffff']]) {
        const surfaces = PRESETS.paper[mode];
        const shade = readableOn(accent, surfaces, { toward });
        const step = stepOf(accent, toward, shade);
        assert.ok(step >= 0, `${name}/${mode}: ${shade} is on the line to ${toward}`);
        for (let i = 0; i < step; i++) {
          assert.ok(!passesAll(mix(accent, toward, i / 256), surfaces, 5), `${name}/${mode}: step ${i} already passes`);
        }
      }
    }
  });

  it('defaults toward to whichever of black and white reads on the first surface', () => {
    assert.equal(readableOn('#ffd400', ['#ffffff']), readableOn('#ffd400', ['#ffffff'], { toward: 'black' }));
    assert.equal(readableOn('#1e3a8a', ['#111111']), readableOn('#1e3a8a', ['#111111'], { toward: 'white' }));
  });

  it('shifts toward a custom hex color', () => {
    const shade = readableOn('#ffd400', ['#ffffff'], { toward: '#1e3a8a' });
    assert.ok(contrastRatio(shade, '#ffffff') >= 5);
    assert.ok(stepOf('#ffd400', '#1e3a8a', shade) > 0);
  });

  it('honours the ratio: a higher bar shifts further', () => {
    const aa = readableOn('#ffd400', ['#ffffff'], { ratio: 4.5 });
    const five = readableOn('#ffd400', ['#ffffff']);
    const aaa = readableOn('#ffd400', ['#ffffff'], { ratio: 7 });
    assert.ok(contrastRatio(aa, '#ffffff') >= 4.5);
    assert.ok(contrastRatio(aaa, '#ffffff') >= 7);
    assert.ok(relativeLuminance(aa) > relativeLuminance(five));
    assert.ok(relativeLuminance(five) > relativeLuminance(aaa));
  });

  it('returns toward itself when no shade can reach the ratio', () => {
    assert.equal(readableOn('#ff0000', ['#777777'], { toward: 'black' }), '#000000');
    assert.equal(readableOn('#ff0000', ['#777777'], { toward: 'white' }), '#ffffff');
    assert.ok(contrastRatio('#000000', '#777777') < 5);
  });

  it('accepts 3-digit, uppercase and bare hex, and returns lowercase #rrggbb', () => {
    const shade = readableOn('#ffd400', ['#ffffff']);
    assert.equal(readableOn('#FFD400', ['#FFF']), shade);
    assert.equal(readableOn('ffd400', ['fff']), shade);
    assert.equal(readableOn('#F00', ['#fff']), readableOn('#ff0000', ['#ffffff']));
    assert.equal(readableOn('#00F', ['#fff']), '#0000ff');
  });

  it('returns the color unchanged (normalised) with no surfaces', () => {
    assert.equal(readableOn('#FFD400', []), '#ffd400');
  });
});

describe('deriveAccent', () => {
  it('meets the ratio in both modes for every preset and accent', () => {
    for (const [preset, surfaces] of Object.entries(PRESETS)) {
      for (const [name, accent] of Object.entries(ACCENTS)) {
        const d = deriveAccent(accent, surfaces);
        const where = `${preset}/${name}`;
        assert.equal(d.accent, accent, where);
        for (const s of surfaces.light) assert.ok(contrastRatio(d.accentText, s) >= 5, `${where}: ${d.accentText} on ${s}`);
        for (const s of surfaces.dark) assert.ok(contrastRatio(d.accentTextDark, s) >= 5, `${where}: ${d.accentTextDark} on ${s}`);
        assert.equal(d.onAccent, readableText(accent), where);
      }
    }
  });

  it('darkens a yellow for light mode and keeps it for dark', () => {
    assert.deepEqual(deriveAccent('#FFD400', PRESETS.paper), {
      accent: '#ffd400',
      accentText: '#786300',
      accentTextDark: '#ffd400',
      onAccent: '#000000',
    });
  });

  it('lightens a navy for dark mode and keeps it for light', () => {
    const d = deriveAccent('#1e3a8a', PRESETS.ink);
    assert.equal(d.accentText, '#1e3a8a');
    assert.notEqual(d.accentTextDark, '#1e3a8a');
    assert.ok(relativeLuminance(d.accentTextDark) > relativeLuminance('#1e3a8a'));
    assert.equal(d.onAccent, '#ffffff');
  });

  it('honours a custom ratio', () => {
    const d = deriveAccent('#ffd400', { ...PRESETS.paper, ratio: 7 });
    for (const s of PRESETS.paper.light) assert.ok(contrastRatio(d.accentText, s) >= 7);
    for (const s of PRESETS.paper.dark) assert.ok(contrastRatio(d.accentTextDark, s) >= 7);
  });

  it('falls back to a white page and a black page with no surfaces', () => {
    assert.deepEqual(deriveAccent('#ffd400'), deriveAccent('#ffd400', { light: ['#ffffff'], dark: ['#000000'] }));
    assert.deepEqual(deriveAccent('#ffd400', { light: [], dark: [] }), deriveAccent('#ffd400'));
  });
});
