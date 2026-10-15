'use strict';
// Запуск: node test.js. Только встроенный assert, без установки пакетов.
const assert = require('node:assert/strict');
const C = require('./color.js');
let count=0, maxError=0;
function near(actual,expected,eps=1e-9){
  assert.equal(actual.length,expected.length);
  actual.forEach((x,i)=>{assert.ok(Number.isFinite(x));
    const error=Math.abs(x-expected[i]);maxError=Math.max(maxError,error);
    assert.ok(error<eps,`${actual} != ${expected}`);});count++;
}
const cases=[
  [[0,0,0],[0,0,0,100],[0,0,0]],
  [[255,255,255],[0,0,0,0],[0,0,100]],
  [[255,0,0],[0,100,100,0],[0,100,100]],
  [[0,255,0],[100,0,100,0],[120,100,100]],
  [[0,0,255],[100,100,0,0],[240,100,100]],
  [[0,255,255],[100,0,0,0],[180,100,100]],
  [[255,0,255],[0,100,0,0],[300,100,100]],
  [[255,255,0],[0,0,100,0],[60,100,100]],
  [[128,128,128],[0,0,0,49.80392156862745],[0,0,50.19607843137255]]
];
for(const [rgb,cmyk,hsv] of cases){
  near(C.rgbToCmyk(rgb),cmyk);near(C.cmykToRgb(cmyk),rgb);
  near(C.rgbToHsv(rgb),hsv);near(C.hsvToRgb(hsv),rgb);
}
// Все шесть секторов HSV и их середины.
for(let h=0;h<=360;h+=30){
  const rgb=C.hsvToRgb([h,70,80]);near(C.hsvToRgb(C.rgbToHsv(rgb)),rgb);
}
near(C.hsvToRgb([360,100,100]),[255,0,0]);
near(C.cmykToRgb([10,20,30,100]),[0,0,0]);
near(C.convert('cmyk',[10,20,30,100]).cmyk,[10,20,30,100]);
near(C.convert('hsv',[275,0,0]).hsv,[275,0,0]);
near(C.convert('rgb',[12.25,24.5,48.75]).rgb,[12.25,24.5,48.75]);
assert.equal(C.rgbToHex([0,128,255]),'#0080FF');count++;
near(C.hexToRgb('#0080ff'),[0,128,255]);
for(const invalid of ['red','#fff','#GG0000','123456','#00000000']){
  assert.throws(()=>C.hexToRgb(invalid));count++;
}
// Детерминированные случайные цвета, без округления между моделями.
let seed=123456789;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
for(let i=0;i<10000;i++){
  const rgb=Array.from({length:3},()=>random()*255);
  near(C.cmykToRgb(C.rgbToCmyk(rgb)),rgb);
  near(C.hsvToRgb(C.rgbToHsv(rgb)),rgb);
  const ink=Array.from({length:4},()=>random()*100);
  const converted=C.convert('cmyk',ink);
  near(C.hsvToRgb(converted.hsv),converted.rgb);
}
console.log(`OK: ${count} проверок; 10000 случайных RGB и CMYK наборов.`);
console.log(`Максимальная абсолютная погрешность: ${maxError.toExponential(3)} (допуск 1e-9).`);
