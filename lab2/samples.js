/* Воспроизводимая база тестов. PNG-копии и эталоны находятся в samples/. */
(function(root){
  'use strict';
  const catalog=[
    {id:'detail',name:'Объект с деталями',description:'Три группы яркости. Тёмные детали относятся к объекту.',invert:true},
    {id:'small',name:'Малый яркий объект',description:'Яркий объект на фоне с более светлой областью.',invert:false},
    {id:'balanced',name:'Две области',description:'Две хорошо разделённые группы яркости.',invert:false},
    {id:'impulse',name:'Соль и перец',description:'Импульсный шум 12%. Есть чистый эталон.',invert:true},
    {id:'salt',name:'Белые импульсы',description:'Светлые точки на тёмном фоне. Есть чистый эталон.',invert:false},
    {id:'pepper',name:'Чёрные импульсы',description:'Тёмные точки на светлом фоне. Есть чистый эталон.',invert:true}
  ];
  function generate(id){
    const descriptor=catalog.find(s=>s.id===id);if(!descriptor)throw new Error('Неизвестный пример');
    const width=320,height=220,n=width*height;
    const image=new Uint8ClampedArray(n),clean=new Uint8ClampedArray(n),truth=new Uint8ClampedArray(n);
    let seed=20261015;
    function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed+.5)/4294967296;}
    function normal(){return Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());}
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=y*width+x,xx=x/width,yy=y/height;
      const part=((xx-.5)/.46)**2+((yy-.5)/.45)**2<1;
      const detail=part&&((xx>.27&&xx<.43&&yy>.22&&yy<.55)||(xx>.60&&xx<.76&&yy>.42&&yy<.74));
      const small=(xx>.69&&xx<.86&&yy>.32&&yy<.67);
      let value=0,mask=false;
      if(id==='detail'){mask=part;value=part?(detail?30:140):220;image[i]=value+normal()*4;}
      else if(id==='small'){mask=small;value=small?220:(xx>.42?115:48);image[i]=value+normal()*4;}
      else if(id==='balanced'){mask=part;value=part?190:50;image[i]=value+normal()*13;}
      else{
        mask=part;
        value=id==='salt'?(part?95:25):id==='pepper'?(part?120:230):(part?65:195);
        image[i]=value;
        if(random()<.12)image[i]=id==='salt'?255:id==='pepper'?0:(random()<.5?0:255);
      }
      clean[i]=value;truth[i]=mask?255:0;
    }
    return {...descriptor,width,height,image,clean,truth};
  }
  const api={catalog,generate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Samples=api;
})(typeof globalThis!=='undefined'?globalThis:this);
