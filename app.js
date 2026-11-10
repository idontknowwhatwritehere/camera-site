function setAppHeight(){const h=window.visualViewport?window.visualViewport.height:window.innerHeight;document.documentElement.style.setProperty('--app-height',h+'px')}
setAppHeight();window.addEventListener('resize',setAppHeight);window.addEventListener('orientationchange',setAppHeight);if(window.visualViewport){visualViewport.addEventListener('resize',setAppHeight);visualViewport.addEventListener('scroll',setAppHeight)}

document.addEventListener('touchmove',e=>{if(e.target.closest('.side-menu'))return;e.preventDefault()},{passive:false});

const video=document.getElementById('video');
const photoImage=document.getElementById('photoImage');
const canvas=document.getElementById('overlay');
const ctx=canvas.getContext('2d');
const result=document.getElementById('result');
const startBtn=document.getElementById('startBtn');
const uploadBtn=document.getElementById('uploadBtn');
const imageInput=document.getElementById('imageInput');
const cameraBox=document.getElementById('cameraBox');
const menuBtn=document.getElementById('menuBtn');
const closeMenuBtn=document.getElementById('closeMenuBtn');
const sideMenu=document.getElementById('sideMenu');
const shade=document.getElementById('shade');
const langBtn=document.getElementById('langBtn');
const langPanel=document.getElementById('langPanel');
const hiddenCanvas=document.createElement('canvas');
const hiddenCtx=hiddenCanvas.getContext('2d',{willReadFrequently:true});

const I18N={
  ru:{login:'Вход',guest:'Гость',title:'Концентрация',hint:'Откройте камеру или загрузите изображение. Обведите пятно.',openCamera:'Открыть камеру',uploadImage:'Загрузить изображение',menu:'Меню',loginDemo:'Это демо-окно. Авторизацию можно добавить позже.',name:'Имя',password:'Пароль',enter:'Войти',cameraClosed:'Камера не открыта',imageLoaded:'Изображение загружено',spotReady:'Обведите пятно',drawingSpot:'Замкните контур',spotTooSmall:'Область слишком маленькая',bottom:'Концентрация в нг/мл',cameraError:'Ошибка камеры'},
  kk:{login:'Кіру',guest:'Қонақ',title:'Концентрация',hint:'Камераны ашыңыз немесе сурет жүктеңіз. Дақты қоршаңыз.',openCamera:'Камераны ашу',uploadImage:'Сурет жүктеу',menu:'Мәзір',loginDemo:'Бұл демо терезе. Авторизацияны кейін қосуға болады.',name:'Аты',password:'Құпиясөз',enter:'Кіру',cameraClosed:'Камера ашылмаған',imageLoaded:'Сурет жүктелді',spotReady:'Дақты қоршаңыз',drawingSpot:'Контурды жабыңыз',spotTooSmall:'Аймақ тым кішкентай',bottom:'Концентрация нг/мл',cameraError:'Камера қатесі'},
  en:{login:'Login',guest:'Guest',title:'Concentration',hint:'Open the camera or upload an image. Circle the spot.',openCamera:'Open camera',uploadImage:'Upload image',menu:'Menu',loginDemo:'This is a demo window. Authorization can be added later.',name:'Name',password:'Password',enter:'Log in',cameraClosed:'Camera is not open',imageLoaded:'Image loaded',spotReady:'Circle the spot',drawingSpot:'Close the contour',spotTooSmall:'Area is too small',bottom:'Concentration in ng/ml',cameraError:'Camera error'}
};

Object.assign(I18N.ru,{collectionTime:'Время сбора слюны',chooseTime:'Выберите время',referenceHelp:'О диапазонах',referenceDisclaimer:'Справочные диапазоны лабораторного метода не валидированы для этого приложения. Цвет не является диагнозом.',within:'В справочном диапазоне',outside:'Вне справочного диапазона',belowZero:'Расчёт ниже нуля: проверьте снимок и выделенную область.',selectTime:'Выберите время сбора для сравнения.'});
Object.assign(I18N.en,{collectionTime:'Saliva collection time',chooseTime:'Select time',referenceHelp:'About ranges',referenceDisclaimer:'These laboratory reference ranges have not been validated for this app. Color is not a diagnosis.',within:'Within reference range',outside:'Outside reference range',belowZero:'Calculation below zero: check the image and selected area.',selectTime:'Select collection time to compare.'});
Object.assign(I18N.kk,{collectionTime:'Сілекей жинау уақыты',chooseTime:'Уақытты таңдаңыз',referenceHelp:'Аралықтар туралы',referenceDisclaimer:'Зертханалық аралықтар бұл қолданба үшін тексерілмеген. Түс диагноз болып саналмайды.',within:'Анықтамалық аралықта',outside:'Анықтамалық аралықтан тыс',belowZero:'Есеп нөлден төмен: сурет пен таңдалған аймақты тексеріңіз.',selectTime:'Салыстыру үшін жинау уақытын таңдаңыз.'});
Object.assign(I18N.ru,{mainSite:'О проекте Rapid Cortisol'});Object.assign(I18N.en,{mainSite:'About Rapid Cortisol'});Object.assign(I18N.kk,{mainSite:'Rapid Cortisol жобасы туралы'});
let currentLang='ru';
let cameraStarted=false;
let imageLoaded=false;
let activeSource=null;
let currentPoints=[];
let finalSpotResult=null;
let isDrawingSpot=false;


const collectionTime=document.getElementById('collectionTime');
const referenceStatus=document.getElementById('referenceStatus');
const REFERENCE_RANGES={morning:{min:1,max:7.5,inclusive:true,label:'1–7.5 ng/ml'},afternoon:{min:0,max:4.01,inclusive:false,label:'<4.01 ng/ml'},night:{min:0,max:1,inclusive:false,label:'<1 ng/ml'}};
function classifyResult(r,period){
 if(!r||!Number.isFinite(r.c))return null;
 if(r.rawC<0)return 'invalid';
 const range=REFERENCE_RANGES[period];if(!range)return null;
 return r.c>=range.min&&(range.inclusive?r.c<=range.max:r.c<range.max)?'within':'outside';
}
function updateReference(){
 result.classList.remove('result-within','result-outside');
 const r=finalSpotResult;
 if(!r||isDrawingSpot){referenceStatus.textContent='';return;}
 const classification=classifyResult(r,collectionTime.value);
 if(classification==='invalid'){result.classList.add('result-outside');referenceStatus.textContent=t('belowZero');return;}
 if(!classification){referenceStatus.textContent=t('selectTime');return;}
 result.classList.add(classification==='within'?'result-within':'result-outside');
 referenceStatus.textContent=t(classification)+' · '+REFERENCE_RANGES[collectionTime.value].label;
}
function setResultText(text){result.textContent=text;updateReference();}
collectionTime.addEventListener('change',updateReference);

function t(k){return I18N[currentLang][k]||k}
function hasSource(){return cameraStarted||imageLoaded}
function applyLanguage(){
  document.documentElement.lang=currentLang;
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>el.placeholder=t(el.dataset.i18nPlaceholder));
  if(!hasSource())setResultText(t('cameraClosed'));
  else if(finalSpotResult)setResultText(formatSpotResult(finalSpotResult));
  else setResultText(t('spotReady'));
}
function openMenu(){sideMenu.classList.add('open');shade.classList.add('open');menuBtn.setAttribute('aria-expanded','true')}
function closeMenu(){sideMenu.classList.remove('open');shade.classList.remove('open');menuBtn.setAttribute('aria-expanded','false')}

menuBtn.onclick=openMenu;closeMenuBtn.onclick=closeMenu;shade.onclick=closeMenu;
langBtn.onclick=e=>{e.stopPropagation();langPanel.classList.toggle('open')};
document.addEventListener('click',e=>{if(!e.target.closest('.lang-wrap'))langPanel.classList.remove('open')});
langPanel.onclick=e=>{const b=e.target.closest('[data-lang]');if(!b)return;currentLang=b.dataset.lang;langPanel.classList.remove('open');applyLanguage()};

startBtn.onclick=async e=>{
  e.stopPropagation();
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    video.srcObject=stream;
    video.onloadedmetadata=()=>{
      video.play();
      cameraStarted=true;
      imageLoaded=false;
      activeSource='camera';
      photoImage.style.display='none';
      photoImage.removeAttribute('src');
      startBtn.style.display='none';
      currentPoints=[];
      finalSpotResult=null;
      setResultText(t('spotReady'));
    };
  }catch(err){
    setResultText(t('cameraError'));
    alert(t('cameraError')+': '+err.message);
  }
};

uploadBtn.onclick=e=>{e.stopPropagation();imageInput.click()};
imageInput.onchange=()=>{
  const file=imageInput.files[0];
  if(!file)return;
  const url=URL.createObjectURL(file);
  photoImage.onload=()=>{
    URL.revokeObjectURL(url);
    imageLoaded=true;
    activeSource='image';
    photoImage.style.display='block';
    startBtn.style.display='none';
    currentPoints=[];
    finalSpotResult=null;
    setResultText(t('spotReady'));
  };
  photoImage.src=url;
  imageInput.value='';
};

function getPointerPercent(e){const r=cameraBox.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100}}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function distance(x1,y1,x2,y2){return Math.hypot(x1-x2,y1-y2)}

cameraBox.addEventListener('pointerdown',e=>{
  if(e.target.closest('button'))return;
  e.preventDefault();
  if(!hasSource())return;
  const pos=getPointerPercent(e);
  isDrawingSpot=true;
  currentPoints=[pos];
  finalSpotResult=null;
  cameraBox.setPointerCapture(e.pointerId);
  setResultText(t('drawingSpot'));
});

cameraBox.addEventListener('pointermove',e=>{
  if(!isDrawingSpot)return;
  e.preventDefault();
  const pos=getPointerPercent(e);
  const last=currentPoints[currentPoints.length-1];
  if(!last||distance(pos.x,pos.y,last.x,last.y)>0.6)currentPoints.push(pos);
});

cameraBox.addEventListener('pointerup',finishDrawing);
cameraBox.addEventListener('pointercancel',finishDrawing);
cameraBox.addEventListener('lostpointercapture',finishDrawing);

function finishDrawing(e){
  if(e)e.preventDefault();
  if(!isDrawingSpot)return;
  isDrawingSpot=false;
  if(currentPoints.length<3){
    finalSpotResult=null;
    setResultText(t('spotTooSmall'));
    return;
  }
  finalSpotResult=measureSpotC(currentPoints);
  setResultText(finalSpotResult?formatSpotResult(finalSpotResult):t('spotTooSmall'));
}

function resizeCanvas(){
  const box=cameraBox.getBoundingClientRect();
  const pr=window.devicePixelRatio||1;
  const cw=Math.round(box.width*pr);
  const ch=Math.round(box.height*pr);
  if(canvas.width!==cw||canvas.height!==ch){
    canvas.width=cw;canvas.height=ch;
    canvas.style.width=box.width+'px';canvas.style.height=box.height+'px';
  }
  ctx.setTransform(pr,0,0,pr,0,0);
  if(hiddenCanvas.width!==cw||hiddenCanvas.height!==ch){hiddenCanvas.width=cw;hiddenCanvas.height=ch}
}

function drawSourceCover(src,sw0,sh0){
  const tw=hiddenCanvas.width,th=hiddenCanvas.height,sr=sw0/sh0,tr=tw/th;
  let sx=0,sy=0,sw=sw0,sh=sh0;
  if(sr>tr){sw=sh0*tr;sx=(sw0-sw)/2}else{sh=sw0/tr;sy=(sh0-sh)/2}
  hiddenCtx.clearRect(0,0,tw,th);
  hiddenCtx.drawImage(src,sx,sy,sw,sh,0,0,tw,th);
}

function pointInPolygon(x,y,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;
    const hit=(yi>y)!==(yj>y)&&x<((xj-xi)*(y-yi))/(yj-yi)+xi;
    if(hit)inside=!inside;
  }
  return inside;
}

function measureSpotC(points){
  const w=hiddenCanvas.width,h=hiddenCanvas.height;
  const poly=points.map(p=>({x:p.x/100*w,y:p.y/100*h}));
  const minX=clamp(Math.floor(Math.min(...poly.map(p=>p.x))),0,w-1);
  const maxX=clamp(Math.ceil(Math.max(...poly.map(p=>p.x))),0,w-1);
  const minY=clamp(Math.floor(Math.min(...poly.map(p=>p.y))),0,h-1);
  const maxY=clamp(Math.ceil(Math.max(...poly.map(p=>p.y))),0,h-1);
  const img=hiddenCtx.getImageData(0,0,w,h).data;
  let redSum=0,greenSum=0,count=0;
  for(let y=minY;y<=maxY;y++){
    for(let x=minX;x<=maxX;x++){
      if(!pointInPolygon(x,y,poly))continue;
      const i=(y*w+x)*4;
      redSum+=img[i];
      greenSum+=img[i+1];
      count++;
    }
  }
  if(count<10)return null;
  const x=(redSum/count)-(greenSum/count);
  const rawC=0.2684*x+0.1426;
  if(!Number.isFinite(rawC))return null;
  return {c:Math.max(0,rawC),rawC};
}

function formatSpotResult(r){return `C: ${r.c.toFixed(3)} нг/мл`}

function drawSpotPolygon(points,closed){
  if(!points.length)return;
  const box=cameraBox.getBoundingClientRect();
  ctx.lineWidth=closed?4:3;
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.strokeStyle=closed?'rgba(0,255,150,.9)':'rgba(255,255,255,.9)';
  ctx.fillStyle=closed?'rgba(0,255,150,.16)':'rgba(255,255,255,.10)';
  ctx.beginPath();
  ctx.moveTo(points[0].x/100*box.width,points[0].y/100*box.height);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x/100*box.width,points[i].y/100*box.height);
  if(closed)ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function loop(){
  if(!hasSource()){requestAnimationFrame(loop);return}
  let ready=false;
  if(activeSource==='camera')ready=video.videoWidth&&video.videoHeight;
  if(activeSource==='image')ready=photoImage.naturalWidth&&photoImage.naturalHeight;
  if(ready){
    resizeCanvas();
    if(activeSource==='camera')drawSourceCover(video,video.videoWidth,video.videoHeight);
    else drawSourceCover(photoImage,photoImage.naturalWidth,photoImage.naturalHeight);
    const box=cameraBox.getBoundingClientRect();
    ctx.clearRect(0,0,box.width,box.height);
    drawSpotPolygon(currentPoints,!isDrawingSpot&&currentPoints.length>=3);
    if(finalSpotResult&&!isDrawingSpot)setResultText(formatSpotResult(finalSpotResult));
    else if(!isDrawingSpot&&!currentPoints.length)setResultText(t('spotReady'));
  }
  requestAnimationFrame(loop);
}

applyLanguage();
loop();

document.addEventListener('dragstart',e=>{if(e.target instanceof HTMLImageElement)e.preventDefault()});
