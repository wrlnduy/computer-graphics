'use strict';
const C = ColorModels;
const definitions = {
  cmyk: {title:'CMYK', tag:'КРАСКА', description:'Cyan · Magenta · Yellow · Key',
    names:['C — голубой','M — пурпурный','Y — жёлтый','K — чёрный'], max:[100,100,100,100],
    units:['%','%','%','%'], axes:[0,1], axisNames:['C →','M ↑']},
  rgb: {title:'RGB', tag:'СВЕТ', description:'Red · Green · Blue',
    names:['R — красный','G — зелёный','B — синий'], max:[255,255,255],
    units:['','',''], axes:[0,1], axisNames:['R →','G ↑']},
  hsv: {title:'HSV', tag:'ВОСПРИЯТИЕ', description:'Hue · Saturation · Value',
    names:['H — тон','S — насыщенность','V — яркость'], max:[360,100,100],
    units:['°','%','%'], axes:[1,2], axisNames:['S →','V ↑']}
};
let state = C.convert('rgb', [52,115,235]);
const controls = {}, status = document.getElementById('status');
const format = n => String(Number(n.toFixed(2)));
function message(text, error=false) {
  status.textContent=text; status.classList.toggle('error',error);
}
function update(model, values, origin=null) {
  state=C.convert(model,values);
  message('Обновлено из '+definitions[model].title+' · все модели синхронизированы');
  render(origin);
}
for (const [model,d] of Object.entries(definitions)) {
  const card=document.createElement('section'); card.className='model';
  card.setAttribute('aria-labelledby',model+'-title');
  card.innerHTML=`<div class="model-head"><h2 id="${model}-title">${d.title}</h2><span class="tag">${d.tag}</span></div><p class="description">${d.description}</p>`;
  controls[model]={numbers:[],ranges:[]};
  d.names.forEach((name,i)=>{
    const row=document.createElement('div'); row.className='channel';
    row.innerHTML=`<div class="channel-top"><label for="${model}-${i}">${name}</label><div><input id="${model}-${i}" type="number" min="0" max="${d.max[i]}" step="0.01" aria-label="${d.title} ${name}" aria-describedby="status"><span class="unit">${d.units[i]}</span></div></div><input type="range" min="0" max="${d.max[i]}" step="0.01" aria-label="${d.title} ${name} ползунок">`;
    const number=row.querySelector('[type=number]'), range=row.querySelector('[type=range]');
    controls[model].numbers.push(number);controls[model].ranges.push(range);
    for(const input of [number,range]) input.addEventListener('input',()=>{
      const value=input.valueAsNumber;
      if(!Number.isFinite(value)||value<0||value>d.max[i]){
        input.setAttribute('aria-invalid','true');
        message(`${d.title}: ${name}. Введите число от 0 до ${d.max[i]}.`,true);return;
      }
      input.removeAttribute('aria-invalid');
      const next=[...state[model]];next[i]=value;update(model,next,input);
    });
    number.addEventListener('blur',()=>{
      if(number.getAttribute('aria-invalid')!=='true')number.value=format(state[model][i]);
    });
    card.append(row);
  });
  const wrap=document.createElement('div');wrap.className='palette-wrap';
  wrap.innerHTML=`<p class="palette-title"><span>Палитра ${d.title}</span><span>${d.axisNames.join(' / ')}</span></p><canvas class="palette" width="320" height="145" tabindex="0" role="img" aria-label="Палитра ${d.title}. ${d.axisNames.join(', ')}. Кликните или используйте стрелки. Остальные компоненты фиксированы."></canvas><p class="palette-help">Клик или перетаскивание · стрелки с клавиатуры<br>Остальные компоненты сохраняют текущие значения.</p>`;
  const canvas=wrap.querySelector('canvas');controls[model].canvas=canvas;
  let dragging=false;
  function pick(event){
    const rect=canvas.getBoundingClientRect(), [a,b]=d.axes;
    const next=[...state[model]];
    next[a]=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width))*d.max[a];
    next[b]=(1-Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height)))*d.max[b];
    update(model,next);
  }
  canvas.addEventListener('pointerdown',e=>{dragging=true;canvas.setPointerCapture(e.pointerId);canvas.focus();pick(e);});
  canvas.addEventListener('pointermove',e=>{if(dragging)pick(e);});
  canvas.addEventListener('pointerup',()=>{dragging=false;});
  canvas.addEventListener('pointercancel',()=>{dragging=false;});
  canvas.addEventListener('keydown',e=>{
    const axis=['ArrowLeft','ArrowRight'].includes(e.key)?d.axes[0]:d.axes[1];
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();const next=[...state[model]];
    next[axis]=Math.max(0,Math.min(d.max[axis],next[axis]+(['ArrowLeft','ArrowDown'].includes(e.key)?-1:1)*(e.shiftKey?5:1)));
    update(model,next);
  });
  card.append(wrap);document.getElementById('models').append(card);
}
function palette(model){
  const d=definitions[model],canvas=controls[model].canvas,ctx=canvas.getContext('2d');
  const w=canvas.width,h=canvas.height,img=ctx.createImageData(w,h),[a,b]=d.axes;
  const values=[...state[model]];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    values[a]=x/(w-1)*d.max[a];values[b]=(1-y/(h-1))*d.max[b];
    const rgb=model==='rgb'?values:model==='cmyk'?C.cmykToRgb(values):C.hsvToRgb(values);
    const pos=(y*w+x)*4;
    for(let i=0;i<3;i++)img.data[pos+i]=rgb[i];img.data[pos+3]=255;
  }
  ctx.putImageData(img,0,0);
  const x=state[model][a]/d.max[a]*(w-1),y=(1-state[model][b]/d.max[b])*(h-1);
  ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.stroke();
  ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
}
let frame;
function render(origin=null){
  for(const [model,d] of Object.entries(definitions))d.names.forEach((_,i)=>{
    const n=controls[model].numbers[i],r=controls[model].ranges[i];
    if(n!==origin)n.value=format(state[model][i]);
    if(r!==origin)r.value=state[model][i];
    if(n!==origin)n.removeAttribute('aria-invalid');
    const stops=[];
    for(let j=0;j<=12;j++){
      const values=[...state[model]];values[i]=d.max[i]*j/12;
      stops.push(C.rgbToHex(C.convert(model,values).rgb));
    }
    r.style.background=`linear-gradient(to right,${stops.join(',')})`;
  });
  const hex=C.rgbToHex(state.rgb),hexInput=document.getElementById('hex');
  if(hexInput!==origin){hexInput.value=hex;hexInput.removeAttribute('aria-invalid');}
  document.getElementById('picker').value=hex;
  document.getElementById('preview').style.backgroundColor=hex;
  document.getElementById('preview-label').style.color=(state.rgb[0]*.299+state.rgb[1]*.587+state.rgb[2]*.114)>150?'#182135':'#fff';
  document.getElementById('preview-label').textContent='Текущий цвет · '+hex;
  cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>Object.keys(definitions).forEach(palette));
}
const hexInput=document.getElementById('hex');
hexInput.addEventListener('input',()=>{
  try{const rgb=C.hexToRgb(hexInput.value);hexInput.removeAttribute('aria-invalid');update('rgb',rgb,hexInput);}
  catch(error){hexInput.setAttribute('aria-invalid','true');message(error.message,true);}
});
document.getElementById('picker').addEventListener('input',e=>update('rgb',C.hexToRgb(e.target.value)));
for(const [hex,name] of [['#FF0000','Красный'],['#00FF00','Зелёный'],['#0000FF','Синий'],['#00FFFF','Голубой'],['#FF00FF','Пурпурный'],['#FFFF00','Жёлтый'],['#FFFFFF','Белый'],['#808080','Серый'],['#000000','Чёрный']]){
  const button=document.createElement('button');button.type='button';button.className='swatch';
  button.style.backgroundColor=hex;button.title=name+' '+hex;button.setAttribute('aria-label',name+' '+hex);
  button.addEventListener('click',()=>update('rgb',C.hexToRgb(hex)));
  document.getElementById('swatches').append(button);
}
document.getElementById('reset').addEventListener('click',()=>update('rgb',[52,115,235]));
render();
