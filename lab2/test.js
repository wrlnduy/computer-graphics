'use strict';
const assert=require('node:assert/strict'),P=require('./processing.js'),S=require('./samples.js');
let checks=0;
function same(a,b){assert.deepEqual(Array.from(a),Array.from(b));checks++;}
function ok(condition){assert.ok(condition);checks++;}
function referenceRank(image,w,h,size,kind){
  const out=new Uint8ClampedArray(image.length),r=(size-1)/2;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const values=[];
    for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)values.push(image[Math.max(0,Math.min(h-1,y+dy))*w+Math.max(0,Math.min(w-1,x+dx))]);
    values.sort((a,b)=>a-b);out[y*w+x]=values[kind==='min'?0:kind==='max'?values.length-1:(values.length-1)/2];
  }
  return out;
}
// Независимая оценка порога через минимум внутриклассовой дисперсии.
function withinVariance(image,t){
  const a=[],b=[];for(const x of image)(x<=t?a:b).push(x);
  if(!a.length||!b.length)return Infinity;
  let sum=0;
  for(const values of [a,b]){const mean=values.reduce((a,b)=>a+b,0)/values.length;for(const x of values)sum+=(x-mean)**2;}
  return sum;
}
same(P.gray([255,0,0,255,0,255,0,255,0,0,255,255,0,0,0,0]),[76,150,29,255]);
for(const level of [0,1,128,254,255]){
  const image=new Uint8ClampedArray(16).fill(level);
  ok(P.otsu(image).threshold===level);ok(P.intermeans(image).threshold===level);
  same(P.binary(image,level),new Uint8ClampedArray(16));
  for(const f of ['median','min','max'])same(P.rankFilter(image,4,4,f,7),image);
}
same(P.binary([0,127,128,255],127),[0,0,255,255]);
same(P.binary([0,127,128,255],127,true),[255,255,0,0]);
ok(P.otsu(new Uint8Array([0,0,255,255])).threshold===0);
ok(P.intermeans(new Uint8Array([0,0,255,255])).threshold===127);
same(P.histogram(new Uint8Array([0,0,128,255])).filter(x=>x),[2,1,1]);
let seed=81219;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
for(let sample=0;sample<120;sample++){
  const w=1+Math.floor(random()*8),h=1+Math.floor(random()*7),image=Uint8ClampedArray.from({length:w*h},()=>random()*255),copy=new Uint8ClampedArray(image);
  for(const size of [3,5,7])for(const kind of ['min','median','max'])same(P.rankFilter(image,w,h,kind,size),referenceRank(image,w,h,size,kind));
  same(image,copy);
  const actual=P.otsu(image).threshold,variance=withinVariance(image,actual);
  if(new Set(image).size>1){
    let best=Infinity;for(let t=0;t<255;t++)best=Math.min(best,withinVariance(image,t));
    ok(Math.abs(variance-best)<1e-6);
  }
  const iteration=P.intermeans(image);ok(iteration.iterations<256);ok(iteration.threshold>=0&&iteration.threshold<=255);
}
for(const id of ['detail','small']){
  const s=S.generate(id),a=P.metrics(P.binary(s.image,P.otsu(s.image).threshold,s.invert),s.truth).error,b=P.metrics(P.binary(s.image,P.intermeans(s.image).threshold,s.invert),s.truth).error;
  ok(id==='detail'?a<b:b<a);
}
for(const [id,filter] of [['impulse','median'],['salt','min'],['pepper','max']]){
  const s=S.generate(id);ok(P.mse(P.rankFilter(s.image,s.width,s.height,filter,3),s.clean)<P.mse(s.image,s.clean));
}
for(const [id,kind] of [['impulse','median'],['salt','min'],['pepper','max']]){
 const s=S.generate(id),filtered=P.rankFilter(s.image,s.width,s.height,kind,3);
 ok(P.metrics(P.binary(filtered,P.otsu(filtered).threshold,s.invert),s.truth).error<.02);
}
ok(P.metrics([0,255],[0,255]).iou===1);ok(P.metrics([0,0],[0,0]).iou===1);
ok(P.metrics([0,255],[255,0]).error===1);ok(P.mse([0,255],[0,255])===0);
for(const action of [()=>P.histogram([]),()=>P.binary([0],-1),()=>P.rankFilter([0],1,1,'median',4),()=>P.rankFilter([0],2,2),()=>P.rankFilter([0],1,1,'mean'),()=>P.metrics([0],[0,1])]){assert.throws(action);checks++;}
console.log(`OK: ${checks} проверок. Оцу сопоставлен с минимумом внутриклассовой дисперсии; ранговые фильтры — с независимой сортировкой окна.`);
