/* Чистые функции: RGB 0..255, CMYK 0..100, HSV H 0..360, S,V 0..100.
   Округление выполняется только при выводе, не между преобразованиями. */
(function (root) {
  'use strict';
  function rgbToCmyk([r, g, b]) {
    const max = Math.max(r, g, b) / 255;
    if (max === 0) return [0, 0, 0, 100];
    return [(1 - r / 255 / max) * 100,
      (1 - g / 255 / max) * 100, (1 - b / 255 / max) * 100,
      (1 - max) * 100];
  }
  function cmykToRgb([c, m, y, k]) {
    return [c, m, y].map(x => 255 * (1 - x / 100) * (1 - k / 100));
  }
  function rgbToHsv([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    return [(h + 360) % 360, max === 0 ? 0 : d / max * 100, max * 100];
  }
  function hsvToRgb([h, s, v]) {
    h = ((h % 360) + 360) % 360; s /= 100; v /= 100;
    const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
    const sectors = [[c, x, 0], [x, c, 0], [0, c, x],
      [0, x, c], [x, 0, c], [c, 0, x]];
    return sectors[Math.floor(h / 60)].map(a => (a + m) * 255);
  }
  function rgbToHex(rgb) {
    return '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  function hexToRgb(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error('Введите HEX в формате #RRGGBB');
    return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  }
  // Единственная точка пересчёта. Исходную модель сохраняем без потерь.
  function convert(model, values) {
    const rgb = model === 'rgb' ? [...values] : model === 'cmyk'
      ? cmykToRgb(values) : hsvToRgb(values);
    return {rgb, cmyk: model === 'cmyk' ? [...values] : rgbToCmyk(rgb),
      hsv: model === 'hsv' ? [...values] : rgbToHsv(rgb)};
  }
  const api = {rgbToCmyk, cmykToRgb, rgbToHsv, hsvToRgb, rgbToHex, hexToRgb, convert};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ColorModels = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
