/* Алгоритмы для 8-битных полутоновых изображений. Без внешних библиотек. */
(function(root){
  'use strict';
  function validate(image,width,height){
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||image.length!==width*height)
      throw new RangeError('Некорректные размеры изображения');
  }
  function gray(rgba){
    if(rgba.length%4!==0)throw new RangeError('Ожидается RGBA');
    const result=new Uint8ClampedArray(rgba.length/4);
    for(let i=0;i<result.length;i++){
      const a=rgba[4*i+3]/255;
      result[i]=Math.round(a*(.299*rgba[4*i]+.587*rgba[4*i+1]+.114*rgba[4*i+2])+255*(1-a));
    }
    return result;
  }
  function histogram(image){
    if(!image.length)throw new RangeError('Пустое изображение');
    const hist=new Uint32Array(256);
    for(const value of image)hist[value]++;
    return hist;
  }
  // Классы [0..T] и [T+1..255]. При равном максимуме выбирается первый T.
  function otsu(image){
    const hist=histogram(image),n=image.length;
    let total=0;for(let i=0;i<256;i++)total+=i*hist[i];
    let count=0,sum=0,best=-1,threshold=0;
    for(let t=0;t<256;t++){
      count+=hist[t];sum+=t*hist[t];
      if(count===0)continue;if(count===n)break;
      const difference=sum/count-(total-sum)/(n-count);
      const variance=(count/n)*((n-count)/n)*difference*difference;
      if(variance>best){best=variance;threshold=t;}
    }
    if(best<0)threshold=image[0]; // Постоянное изображение: один класс.
    return {threshold,iterations:1};
  }
  // Начало T0=(min+max)/2; остановка при неизменном разделении целых уровней.
  function intermeans(image){
    const hist=histogram(image);let min=0,max=255;
    while(!hist[min])min++;while(!hist[max])max--;
    if(min===max)return {threshold:min,iterations:0};
    let threshold=Math.floor((min+max)/2);
    for(let iteration=1;iteration<=256;iteration++){
      let n0=0,n1=0,s0=0,s1=0;
      for(let i=min;i<=max;i++){
        if(i<=threshold){n0+=hist[i];s0+=i*hist[i];}
        else{n1+=hist[i];s1+=i*hist[i];}
      }
      if(!n0||!n1)return {threshold,iterations:iteration};
      const next=Math.floor((s0/n0+s1/n1)/2);
      if(next===threshold)return {threshold,iterations:iteration};
      threshold=next;
    }
    return {threshold,iterations:256};
  }
  function binary(image,threshold,invert=false){
    if(!Number.isFinite(threshold)||threshold<0||threshold>255)throw new RangeError('Порог должен быть от 0 до 255');
    return Uint8ClampedArray.from(image,x=>(x>threshold)!==invert?255:0);
  }
  // Окно k×k, продолжение граничными пикселями (replicate).
  // В каждой строке гистограмма окна обновляется сдвигом, без сортировки окна.
  function rankFilter(image,width,height,kind='median',size=3){
    validate(image,width,height);
    if(!['median','min','max','none'].includes(kind))throw new RangeError('Неизвестный фильтр');
    if(![3,5,7].includes(size))throw new RangeError('Размер окна: 3, 5 или 7');
    if(kind==='none')return new Uint8ClampedArray(image);
    const out=new Uint8ClampedArray(image.length),radius=(size-1)/2;
    const target=kind==='min'?0:kind==='max'?size*size-1:(size*size-1)/2;
    const clamp=(v,max)=>Math.min(max,Math.max(0,v));
    for(let y=0;y<height;y++){
      const hist=new Uint16Array(256),rows=[];
      for(let dy=-radius;dy<=radius;dy++)rows.push(clamp(y+dy,height-1)*width);
      for(const row of rows)for(let dx=-radius;dx<=radius;dx++)hist[image[row+clamp(dx,width-1)]]++;
      for(let x=0;x<width;x++){
        let count=0,value=0;
        for(;value<256;value++){count+=hist[value];if(count>target)break;}
        out[y*width+x]=value;
        if(x+1<width){
          const remove=clamp(x-radius,width-1),add=clamp(x+radius+1,width-1);
          for(const row of rows){hist[image[row+remove]]--;hist[image[row+add]]++;}
        }
      }
    }
    return out;
  }
  function metrics(prediction,truth){
    if(!prediction.length||prediction.length!==truth.length)throw new RangeError('Размеры масок различаются');
    let errors=0,tp=0,fp=0,fn=0;
    for(let i=0;i<truth.length;i++){
      const p=prediction[i]>0,t=truth[i]>0;
      if(p!==t)errors++;if(p&&t)tp++;if(p&&!t)fp++;if(!p&&t)fn++;
    }
    return {error:errors/truth.length,accuracy:1-errors/truth.length,
      iou:tp+fp+fn?tp/(tp+fp+fn):1};
  }
  function mse(image,reference){
    if(!image.length||image.length!==reference.length)throw new RangeError('Размеры изображений различаются');
    let sum=0;for(let i=0;i<image.length;i++)sum+=(image[i]-reference[i])**2;
    return sum/image.length;
  }
  const api={gray,histogram,otsu,intermeans,binary,rankFilter,metrics,mse};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Processing=api;
})(typeof globalThis!=='undefined'?globalThis:this);
