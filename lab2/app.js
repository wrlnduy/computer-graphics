'use strict';
const P=Processing,S=Samples,$=id=>document.getElementById(id);
const filterNames={none:'Без фильтра',median:'Медианный фильтр',min:'Минимальный фильтр',max:'Максимальный фильтр'};
let source=null,generation=0,fileVersion=0;
function draw(id,pixels,width,height){
  const canvas=typeof id==='string'?$(id):id;
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d'),img=ctx.createImageData(width,height);
  for(let i=0;i<pixels.length;i++){img.data[4*i]=pixels[i];img.data[4*i+1]=pixels[i];img.data[4*i+2]=pixels[i];img.data[4*i+3]=255;}
  ctx.putImageData(img,0,0);
}
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function chooseSample(id){
  fileVersion++;source=S.generate(id);$('file').value='';$('filter').value='none';$('size').value='3';$('invert').checked=source.invert;
  document.querySelectorAll('.sample').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));
  $('source-name').textContent=source.name;$('sample-note').textContent=source.description;
  $('dimensions').textContent=`${source.width} × ${source.height} · воспроизводимый тестовый пример`;
  draw('original',source.image,source.width,source.height);schedule();
}
function drawHistogram(image,t0,t1){
  const canvas=$('histogram'),ctx=canvas.getContext('2d'),hist=P.histogram(image),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);let max=1;for(const n of hist)max=Math.max(max,n);
  ctx.strokeStyle='#e7ede9';ctx.lineWidth=1;
  for(let y of [0,h/2,h-1]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  ctx.fillStyle='#a7b9ae';for(let i=0;i<256;i++)ctx.fillRect(i*w/256,h-hist[i]/max*(h-5),Math.max(1,w/256-1),hist[i]/max*(h-5));
  for(const [t,color,dash] of [[t0,'#c77e2f',[]],[t1,'#147f73',[5,4]]]){
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo((t+.5)*w/256,0);ctx.lineTo((t+.5)*w/256,h);ctx.stroke();
  }
  ctx.setLineDash([]);canvas.setAttribute('aria-label',`Гистограмма яркости. Порог Оцу ${t0}, порог итеративного среднего ${t1}.`);
}
function formatMetric(mask){
  if(!source.truth)return 'Эталон не задан · метрика ошибки недоступна';
  const m=P.metrics(mask,source.truth);
  return `Ошибка ${(m.error*100).toFixed(2)}% · IoU ${(m.iou*100).toFixed(2)}%`;
}
function schedule(){
  const version=++generation;
  document.querySelectorAll('.download').forEach(b=>b.disabled=true);
  $('size').disabled=$('filter').value==='none';
  $('filter-help').textContent=$('filter').value==='none'?'Пороговая обработка исходного полутонового изображения.':'Оба порога рассчитываются заново по изображению после выбранного фильтра.';
  status('Обработка…');
  setTimeout(()=>{
    if(version!==generation)return;
    try{
      const started=performance.now(),{width,height,image}=source,kind=$('filter').value,size=Number($('size').value),invert=$('invert').checked;
      const filtered=P.rankFilter(image,width,height,kind,size);
      const a=P.otsu(filtered),b=P.intermeans(filtered),binaryA=P.binary(filtered,a.threshold,invert),binaryB=P.binary(filtered,b.threshold,invert);
      draw('filtered',filtered,width,height);draw('otsu',binaryA,width,height);draw('iter',binaryB,width,height);
      $('filtered-title').textContent=filterNames[kind]+(kind==='none'?'':` ${size} × ${size}`);
      $('otsu-threshold').textContent=`T = ${a.threshold}`;$('iter-threshold').textContent=`T = ${b.threshold}`;
      $('otsu-metric').textContent=formatMetric(binaryA);$('iter-metric').textContent=formatMetric(binaryB)+` · итераций: ${b.iterations}`;
      const before=source.clean?P.mse(image,source.clean):null,after=source.clean?P.mse(filtered,source.clean):null;
      $('filter-metric').textContent=after===null?'Фильтрация полутонового изображения':`MSE к чистому эталону: ${after.toFixed(2)}`;
      $('quality').textContent=before===null?'Сравнивайте результат визуально.':`MSE до / после: ${before.toFixed(2)} / ${after.toFixed(2)}`;
      drawHistogram(filtered,a.threshold,b.threshold);
      status(`Готово · ${width} × ${height} · ${(performance.now()-started).toFixed(0)} мс · белым выделен ${invert?'тёмный':'светлый'} объект`);
      document.querySelectorAll('.download').forEach(button=>button.disabled=false);
    }catch(error){status(error.message,true);}
  },0);
}
for(const d of S.catalog){
  const button=document.createElement('button');button.type='button';button.className='sample';button.dataset.id=d.id;
  button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',d.name);button.title=d.description;
  const canvas=document.createElement('canvas'),label=document.createElement('span');label.textContent=d.name;
  const sample=S.generate(d.id);draw(canvas,sample.image,sample.width,sample.height);
  button.append(canvas,label);button.addEventListener('click',()=>chooseSample(d.id));$('samples').append(button);
}
for(const id of ['filter','size','invert'])$(id).addEventListener('change',schedule);
$('reset').addEventListener('click',()=>{
  $('filter').value='none';$('size').value='3';$('invert').checked=source.invert??false;schedule();
});
$('file').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  const version=++fileVersion;
  if(file.size>30*1024*1024){status('Выберите изображение размером до 30 МБ.',true);event.target.value='';return;}
  const url=URL.createObjectURL(file),image=new Image();
  try{
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Не удалось открыть изображение. Попробуйте PNG, JPEG или WebP.'));image.src=url;});
    if(version!==fileVersion)return;
    const factor=Math.min(1,1024/Math.max(image.naturalWidth,image.naturalHeight));
    const width=Math.max(1,Math.round(image.naturalWidth*factor)),height=Math.max(1,Math.round(image.naturalHeight*factor));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,width,height);
    source={image:P.gray(ctx.getImageData(0,0,width,height).data),width,height,name:file.name,invert:false};
    $('source-name').textContent=file.name;$('sample-note').textContent='Ваше изображение. Цвета переведены в градации серого; прозрачность наложена на белый фон.';
    $('dimensions').textContent=`${width} × ${height}`+(factor<1?` · уменьшено с ${image.naturalWidth} × ${image.naturalHeight}`:'');
    $('invert').checked=false;document.querySelectorAll('.sample').forEach(b=>b.setAttribute('aria-pressed','false'));
    draw('original',source.image,width,height);schedule();
  }catch(error){if(version===fileVersion)status(error.message,true);}finally{URL.revokeObjectURL(url);}
});
for(const button of document.querySelectorAll('.download'))button.addEventListener('click',()=>{
  const canvas=$(button.dataset.canvas);
  canvas.toBlob(blob=>{
    if(!blob){status('Не удалось сформировать PNG.',true);return;}
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.download=`lab2-${button.dataset.canvas}.png`;link.href=url;document.body.append(link);link.click();
    setTimeout(()=>{link.remove();URL.revokeObjectURL(url);},1000);
  },'image/png');
});
chooseSample('detail');
