'use strict';

const el = id => document.getElementById(id);
const scene = el('scene');
const yen = n => '¥' + n.toLocaleString('ja-JP');
const products = [
  ['연어 주먹밥','鮭おむすび',180,'rice','#f38c66'],
  ['참치마요 주먹밥','ツナマヨおむすび',160,'rice','#63cdc9'],
  ['가라아게 도시락','唐揚げ弁当',580,'bento','#e99b54'],
  ['녹차','緑茶',130,'bottle','#9cbd52'],
  ['카페라테','カフェラテ',190,'cup','#d8ad86'],
  ['커스터드 푸딩','カスタードプリン',230,'pudding','#ffca6c'],
  ['슈크림','シュークリーム',200,'bun','#edb36e'],
  ['프라이드치킨','フライドチキン',250,'chicken','#f3a448']
];
const stations = [
  {id:'drinks',name:'음료 냉장고',jp:'ドリンク',label:'DRINKS',x:72,y:43,w:271,h:60,ids:[3,4],side:'bottom'},
  {id:'dessert',name:'디저트 매대',jp:'デザート',label:'SWEETS',x:76,y:169,w:133,h:56,ids:[5,6],side:'both'},
  {id:'meals',name:'도시락·주먹밥 매대',jp:'お弁当・おむすび',label:'BENTO & ONIGIRI',x:92,y:292,w:190,h:59,ids:[0,1,2],side:'both'},
  {id:'hot',name:'핫스낵 진열대',jp:'ホットスナック',label:'HOT SNACKS',x:398,y:161,w:86,h:59,ids:[7],side:'bottom'},
  {id:'register',name:'계산대',jp:'レジ',label:'CHECKOUT',x:484,y:161,w:101,h:59,side:'bottom'},
  {id:'microwave',name:'셀프 전자레인지',jp:'電子レンジ',label:'MICROWAVE',x:491,y:387,w:90,h:35,side:'both'}
];
const fixtures = [...stations,{x:402,y:43,w:180,h:46},{x:36,y:386,w:78,h:39}];
const exit = {id:'exit',x:320,y:444};
const sleeper={id:'sleeper',x:580,y:337,angle:1.48};
const crossing={x:492,y:374};
const spawn = {x:320,y:415,angle:0,pitch:.11,step:0};
const player = {...spawn};
const staffSpawn={x:567,y:114};
const staffRoster=[
  {name:'민',origin:'베트남'},
  {name:'마야',origin:'네팔'},
  {name:'하나',origin:'인도네시아'},
  {name:'아나',origin:'필리핀'}
];
const staff={...staffSpawn,profile:-1,angle:0,step:0,station:null,at:null,idle:2};
let crossingBuffer, crossingAudio;
const guestRoutes=[
  {inside:true,points:[[349,128],[239,130],[320,138]],clip:'guestTea',jp:'温かいお茶にしようかな。',ko:'따뜻한 차로 할까?'},
  {inside:true,points:[[372,365],[315,369],[306,314]],clip:'guestRice',jp:'おにぎり、どれにする？',ko:'주먹밥은 어떤 걸로 할래?'},
  {inside:true,points:[[236,259],[329,253],[304,276]],clip:'guestSweet',jp:'このプリン、おいしそう。',ko:'이 푸딩 맛있겠다.'},
  {inside:false,points:[[445,391],[535,423],[481,454]],clip:'guestView',jp:'東京タワー、きれいだね。',ko:'도쿄타워, 예쁘네.'}
];
const guests=guestRoutes.map(route=>({...route}));
const guestNames=['아오이','료','미사키','하루','유타','나오','사키','쇼','유이'];
let visitCount=0;
function resetGuests(){
  guests.forEach((g,i)=>{
    const appearance=(Math.max(visitCount-1,0)*guests.length+i)%guestNames.length;
    Object.assign(g,{appearance,name:guestNames[appearance],x:g.points[0][0],y:g.points[0][1],angle:0,point:1,pause:1+i*.7,step:0,nextLine:0});
  });
}
resetGuests();
const heldFood=Array(products.length).fill(0);
let warmBento=0, foodResult='';
let mealMotion=null, paymentMotion=null, guestAudio=null, pendingGuest=null, nextGuestLine=0;
const cart = Array(products.length).fill(0);
const keys = new Set();
const touches = new Map();
let started = false, inside = false, wallet = 1000, receipt, modal, nearby;
let scanCount = 0, scanItems = [], scanTimer, captionTimer;
let finished=false, timeOfDay='night';
const microwave={heated:0,endsAt:0,timer:null,shownSeconds:null,ready:false};
const bentoId=products.findIndex(item=>item[3]==='bento');
const renderScene = window.createStoreView(scene,stations,products);
if(!renderScene){
  el('start').disabled=true;
  el('objective').textContent='WebGL을 지원하는 브라우저에서 플레이할 수 있어요';
}

function rect(x,y,w,h,color,g){
  g.fillStyle=color;
  g.fillRect(Math.round(x),Math.round(y),w,h);
}
function art(g,x,y,id){
  const [, , ,type,c]=products[id];
  const r=(a,b,w,h,col)=>rect(x+a,y+b,w,h,col,g);
  if(type==='rice'){
    r(6,2,4,2,'#fff6dc');r(5,4,6,2,'#fff6dc');r(4,6,8,2,'#fff6dc');r(2,8,12,5,'#fff6dc');r(5,8,6,6,'#294b43');r(6,6,4,2,c);
  }else if(type==='bento'){
    r(1,4,14,10,'#422e36');r(2,5,12,7,'#d38a58');r(3,6,5,5,'#fff4d5');r(9,6,4,2,'#b65e38');r(9,9,4,2,'#7d9c59');
  }else if(type==='bottle'){
    r(6,1,4,2,'#e7e8a6');r(5,3,6,2,c);r(4,5,8,9,'#567c45');r(4,6,8,5,c);r(5,7,2,3,'#eaf2b4');
  }else if(type==='cup'){
    r(3,3,10,2,'#f7efdc');r(4,5,8,7,c);r(5,12,6,2,'#f6dfc5');r(5,7,6,3,'#f8ebd7');
  }else if(type==='pudding'){
    r(5,4,6,2,'#a95f3d');r(4,6,8,2,'#d48547');r(3,8,10,4,c);r(2,12,12,2,'#fff0b5');
  }else if(type==='bun'){
    r(4,4,8,2,'#ffe0a0');r(2,6,12,6,c);r(3,12,10,2,'#b87a49');r(3,9,10,2,'#fff1c9');r(5,6,2,1,'#fff4c3');
  }else{
    r(5,2,6,2,'#ffce77');r(3,4,10,6,c);r(5,10,6,2,'#be6935');r(9,11,2,3,'#f5d9ad');r(11,13,2,2,'#f5d9ad');r(4,5,2,2,'#ffe29a');
  }
}
let audio, master, music, voices, localBgm;
let entrySample=Promise.resolve(null);
if(location.protocol==='file:'){
  el('local-controls').hidden=false;
  entrySample=new Promise(resolve=>{
    const script=document.createElement('script');
    script.src='../local-audio.js';
    script.onload=()=>resolve(window.localEntrySample||null);
    script.onerror=()=>resolve(null);
    document.head.append(script);
  });
}
function tone(f,t,d,volume,type='triangle',destination=master){
  const osc=audio.createOscillator(), gain=audio.createGain();
  osc.type=type;
  osc.frequency.value=f;
  gain.gain.setValueAtTime(0,t);
  gain.gain.linearRampToValueAtTime(volume,t+.011);
  gain.gain.exponentialRampToValueAtTime(.0001,t+d);
  osc.connect(gain).connect(destination);
  osc.start(t);
  osc.stop(t+d+.02);
}
function initAudio(){
  if(!audio){
    const Audio=window.AudioContext || window.webkitAudioContext;
    if(!Audio)return;
    audio=new Audio();
    master=audio.createGain();
    master.gain.value=muted?0:.72;
    master.connect(audio.destination);
    voices=Object.fromEntries(Object.entries(window.staffVoiceData||{}).map(([id,data])=>[
      id,audio.decodeAudioData(Uint8Array.from(atob(data),c=>c.charCodeAt(0)).buffer).catch(()=>null)
    ]));
    voices.crossingClip?.then(buffer=>{crossingBuffer=buffer;});
  }
  audio.resume().catch(()=>{});
}
function startMusic(){
  if(!audio||music)return;
  const buffer=localBgm||originalMusic();
  music=playBuffer(buffer,true,.62);
}
function playBuffer(buffer,loop,volume){
  const source=audio.createBufferSource();
  const gain=audio.createGain();
  source.buffer=buffer;
  source.loop=loop;
  gain.gain.value=volume;
  source.connect(gain).connect(master);
  source.start();
  return source;
}
function originalMusic(){
  const beat=.28, cell=beat/2;
  const note=n=>440*2**((n-69)/12);
  const melody=[72,76,79,81,79,76,74,76,77,81,84,81,77,76,74,69,71,74,77,79,77,74,71,74,76,79,83,81,79,76,74,67,72,76,79,84,83,79,76,74,77,81,84,86,84,81,77,76,74,77,81,84,83,81,77,74,71,74,79,77,76,74,71,67];
  const roots=[48,53,55,52,48,53,50,55];
  const sampleRate=audio.sampleRate;
  const buffer=audio.createBuffer(1,Math.round(melody.length*cell*sampleRate),sampleRate);
  const samples=buffer.getChannelData(0);
  function voice(index,n,length,vol,shade){
    const f=note(n), first=Math.round(index*cell*sampleRate);
    for(let i=0;i<length*sampleRate;i++){
      const t=i/sampleRate, phase=2*Math.PI*f*t;
      const envelope=Math.min(t/.008,1)*Math.exp(-t*6)*Math.min((length-t)/.035,1);
      samples[(first+i)%samples.length]+=(Math.sin(phase)+shade*Math.sin(phase*2)) * envelope * vol;
    }
  }
  melody.forEach((n,i)=>{if(i%8!==7||i===63)voice(i,n,cell*1.7,.092,.27);});
  roots.forEach((n,i)=>{
    voice(i*8,n,beat*1.8,.1,.07);
    voice(i*8+4,n+7,beat*1.8,.08,.07);
    for(const offset of [2,6]){voice(i*8+offset,n+12,.19,.034,.16);voice(i*8+offset,n+19,.19,.027,.16);}
  });
  return buffer;
}
function playEntry(){
  if(!audio)return;
  entrySample.then(data=>data?audio.decodeAudioData(Uint8Array.from(atob(data),c=>c.charCodeAt(0)).buffer):null)
    .then(buffer=>{if(buffer)playBuffer(buffer,false,.8);else fx('door');})
    .catch(()=>fx('door'));
}
el('load-bgm').onclick=()=>el('bgm-file').click();
el('bgm-file').onchange=async e=>{
  const file=e.target.files[0];
  if(!file)return;
  initAudio();
  const status=el('music-status');
  try{
    localBgm=await audio.decodeAudioData(await file.arrayBuffer());
    music?.stop();
    music=null;
    if(inside)startMusic();
    status.textContent=file.name;
  }catch{
    status.textContent='재생할 수 없는 파일입니다';
  }
  e.target.value='';
};
const effects={
  door:[[784,0,.25],[1047,.14,.32],[1319,.29,.38]],
  add:[[659,0,.1],[988,.065,.13]],
  scan:[[1520,0,.075]],
  pay:[[523,0,.19],[659,.105,.2],[784,.21,.22],[1047,.33,.35]],
  cash:[[950,0,.08],[1420,.043,.08],[710,.1,.09]],
  microwave:[[1100,0,.16],[1100,.22,.16],[1100,.44,.18]],
  call:[[880,0,.19],[1319,.11,.22]],
  eat:[[236,0,.08],[302,.085,.1]],
  drink:[[230,0,.12],[340,.09,.12],[250,.17,.09]],
  click:[[330,0,.085]]
};
function fx(id){
  if(!audio)return;
  for(const [f,delay,d] of effects[id])tone(f,audio.currentTime+delay,d,id==='scan'?.13:.16);
}
let muted=false;
let spoken;
let speechSequence=0;
function say(jp,ko){
  stopGuestLine();
  nextGuestLine=performance.now()+4600;
  const caption=el('caption');
  caption.replaceChildren(document.createTextNode(jp));
  const sub=document.createElement('small');
  sub.textContent=ko;
  caption.append(sub);
  caption.hidden=false;
  clearTimeout(captionTimer);
  captionTimer=setTimeout(()=>{caption.hidden=true;},2850);
  if(muted)return;
  const id={'いらっしゃいませ！':'welcome','かしこまりました！':'order',[staffLines.bag[0]]:'bag',[staffLines.receipt[0]]:'receipt',[staffLines.thanks[0]]:'thanks'}[jp];
  const sequence=++speechSequence;
  if(spoken)spoken.stop();
  spoken=null;
  Promise.resolve(voices?.[id]).then(buffer=>{
    if(muted||sequence!==speechSequence)return;
    if(buffer){
      spoken=audio.createBufferSource();
      spoken.buffer=buffer;
      spoken.connect(master);
      spoken.start();
      return;
    }
    if(!window.speechSynthesis)return;
    const utterance=new SpeechSynthesisUtterance(jp);
    utterance.lang='ja-JP';
    utterance.voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith('ja'))||null;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  });
}
el('sound').onclick=()=>{
  muted=!muted;
  el('sound').setAttribute('aria-pressed',String(muted));
  el('sound').setAttribute('aria-label',muted?'소리 켜기':'음소거');
  el('sound').title=muted?'소리 켜기':'음소거';
  el('sound').textContent=muted?'♪̸':'♪';
  if(master)master.gain.setTargetAtTime(muted?0:.72,audio.currentTime,.015);
  if(muted){stopGuestLine();speechSequence++;if(spoken)spoken.stop();spoken=null;window.speechSynthesis?.cancel();}
  else if(started){initAudio();if(inside)startMusic();}
};

const total=()=>cart.reduce((sum,n,id)=>sum+n*products[id][2],0);
function hud(){
  el('wallet').textContent=yen(wallet);
  el('count').textContent=cart.reduce((a,b)=>a+b,0);
  el('total').textContent=yen(total());
  el('food').hidden=!receipt;
  el('food-count').textContent=heldFood.reduce((sum,n)=>sum+n,0)+'개';
}
function change(id,delta){
  cart[id]=Math.max(0,cart[id]+delta);
  if(delta>0)fx('add');
  hud();
}
function closeDialog(){
  if(!modal||modal==='paying')return;
  clearTimeout(scanTimer);
  modal=null;
  el('overlay').hidden=true;
  el('close').blur();
}
const staffLines={
  coming:['ただいま伺います。','지금 갈게요.'],
  greeting:['ご注文ですか？','무엇을 도와드릴까요?'],
  recommend:['夜食なら、鮭おむすびと温かいチキンがおすすめです。','야식으로 연어 주먹밥과 따뜻한 치킨을 추천해요.'],
  order:['かしこまりました！','네, 알겠습니다!'],
  register:['お会計ですね。','계산 도와드릴게요.'],
  bag:['レジ袋はご利用ですか？','봉투 드릴까요?'],
  receipt:['レシートはご利用ですか？','영수증 드릴까요?'],
  thanks:['ありがとうございました。またお越しくださいませ。','감사합니다. 또 들러 주세요!']
};
function staffLine(key){
  const [jp,ko]=staffLines[key];
  return '<p class="staff-line"><small>'+staffRoster[staff.profile].name+'</small><strong lang="ja">'+jp+'</strong><small>'+ko+'</small></p>';
}
function talk(line='greeting'){
  if(modal!=='staff')openDialog('staff');
  renderDialog(line);
  say(...staffLines[line]);
}
function openDialog(id){
  keys.clear();
  touches.clear();
  lookPointer=null;
  stopGuestLine();
  modal=id;
  el('overlay').hidden=false;
  renderDialog();
  el('close').focus({preventScroll:true});
}
function row(id,adjust=true){
  const [ko,jp,price]=products[id];
  return '<div class="row"><canvas class="product" width="16" height="16" data-product="'+id+'" aria-hidden="true"></canvas><div class="item"><strong>'+ko+'</strong><small>'+jp+'</small></div><span class="price">'+yen(price)+'</span>'+
    (adjust?'<div class="step"><button data-remove="'+id+'" aria-label="'+ko+' 빼기" '+(cart[id]?'':'disabled')+'>−</button><output>'+cart[id]+'</output>'+(modal==='cart'||modal==='register'?'':'<button data-add="'+id+'" aria-label="'+ko+' '+(id===7?'주문':'담기')+'">+</button>')+'</div>':'')+'</div>';
}
function coldBento(){
  return heldFood[bentoId]-warmBento;
}
function updateObjective(){
  if(!receipt)return;
  const instruction=receipt.printed==null?'계산대에서 봉투와 영수증을 선택하세요':
    microwave.ready?'전자레인지에서 도시락을 꺼내세요':
    microwave.endsAt?'도시락을 데우고 있어요':
    coldBento()>0?'입구 오른쪽 전자레인지에서 도시락을 데우거나 자동문으로 나가세요':
    '입구 쪽 자동문으로 걸어 나가세요';
  el('objective').textContent=instruction;
}
function openCheckout(){
  if(!receipt){talk();return;}
  const pending=receipt.bag==null?'bag':receipt.printed==null?'receipt':null;
  openDialog(pending||'purchase');
  if(pending)say(...staffLines[pending]);
}
function openFood(){
  foodResult='';
  openDialog('food');
}
function foodView(){
  const items=heldFood.flatMap((amount,id)=>{
    if(!amount)return [];
    const [name]=products[id];
    const drink=products[id][3]==='bottle'||products[id][3]==='cup';
    const warm=id===bentoId&&warmBento?' · 따뜻한 도시락 '+warmBento+'개':'';
    return ['<div class="food-row"><canvas class="product" width="16" height="16" data-product="'+id+'" aria-hidden="true"></canvas>'+
      '<div><strong>'+name+'</strong><small>'+amount+'개'+warm+'</small></div>'+
      '<button data-eat="'+id+'" aria-label="'+name+' '+(drink?'마시기':'먹기')+'">'+(drink?'마시기':'먹기')+'</button></div>'];
  });
  return '<p class="food-result" role="status">'+foodResult+'</p>'+
    (items.length?items.join(''):'<p>'+ (microwave.ready||microwave.endsAt?'도시락이 전자레인지에 있어요.':'먹거나 마실 음식이 없어요.')+'</p>');
}
function eat(id){
  if(!heldFood[id]||mealMotion)return;
  const [name,,,type]=products[id];
  const drink=type==='bottle'||type==='cup';
  const warm=id===bentoId&&warmBento>0;
  heldFood[id]--;
  if(warm)warmBento--;
  foodResult=(warm?'따뜻한 ':'')+name+(drink?' 한 잔을 마셨어요.':' 1개를 먹었어요.');
  closeDialog();
  mealMotion={id,drink,startedAt:performance.now(),sound:false};
  el('meal-status').textContent=name+(drink?' 마시는 중…':' 먹는 중…');
  el('meal-status').hidden=false;
  el('meal-motion').hidden=false;
  hud();
  if(inside)updateObjective();
}
function animateMeal(time){
  if(!mealMotion)return;
  const {id,drink,startedAt}=mealMotion;
  const progress=Math.max(0,(time-startedAt)/1250);
  if(progress>.42&&!mealMotion.sound){
    fx(drink?'drink':'eat');
    mealMotion.sound=true;
  }
  if(progress<1){
    window.drawMealMotion(el('meal-motion'),products[id],progress);
    return;
  }
  mealMotion=null;
  el('meal-motion').hidden=el('meal-status').hidden=true;
  openDialog('food');
}
function startPayment(){
  const amount=total();
  paymentMotion={amount,startedAt:performance.now(),sound:false};
  modal='paying';
  el('overlay').hidden=true;
  el('meal-status').textContent=yen(amount)+' · 현금 트레이에 내려놓는 중…';
  el('meal-status').hidden=false;
  el('meal-motion').hidden=false;
}
function animatePayment(time){
  if(!paymentMotion)return;
  const {amount,startedAt}=paymentMotion;
  const progress=Math.max(0,(time-startedAt)/1450);
  if(progress>=.52&&!paymentMotion.sound){
    paymentMotion.sound=true;
    fx('cash');
  }
  if(progress<1){
    window.drawPaymentMotion(el('meal-motion'),amount,progress);
    return;
  }
  paymentMotion=null;
  el('meal-motion').hidden=el('meal-status').hidden=true;
  wallet-=amount;
  receipt={items:cart.flatMap((n,id)=>n?[[id,n]]:[]),total:amount,balance:wallet,bag:null,printed:null};
  for(const [id,quantity] of receipt.items)heldFood[id]=quantity;
  cart.fill(0);
  hud();
  fx('pay');
  updateObjective();
  openCheckout();
}
function purchaseSummary(){
  return '<div class="receipt">'+receipt.items.map(([id,n])=>'<div><span>'+products[id][0]+' × '+n+'</span><span>'+yen(n*products[id][2])+'</span></div>').join('')+
    '<hr><div><strong>합계</strong><strong>'+yen(receipt.total)+'</strong></div><div><span>남은 잔액</span><strong>'+yen(receipt.balance)+'</strong></div></div>';
}
function microwaveView(){
  const seconds=Math.max(0,Math.ceil((microwave.endsAt-performance.now())/1000));
  microwave.shownSeconds=seconds;
  const available=coldBento()>0;
  const status=microwave.ready?'데우기 완료':microwave.endsAt?'데우는 중':available?'가라아게 도시락 · 1개씩 데우기':
    microwave.heated?'도시락을 데웠어요':'결제한 도시락을 데울 수 있어요.';
  return '<div class="microwave-display"><span>'+status+'</span><strong id="heat-clock">0:0'+seconds+'</strong></div>'+
    (microwave.ready?'<button class="primary" data-collect>도시락 꺼내기</button>':
      available&&!microwave.endsAt?'<button class="primary" data-heat>도시락 넣고 시작</button>':'');
}
function renderDialog(announcement=''){
  const station=stations.find(s=>s.id===modal);
  const title=el('panel-title'), kicker=el('panel-kicker'), body=el('panel-body');
  const focus=document.activeElement;
  const control=focus?.matches('[data-add]')?'[data-add="'+focus.dataset.add+'"]':focus?.matches('[data-remove]')?'[data-remove="'+focus.dataset.remove+'"]':null;
  kicker.textContent=station?.jp||({staff:'スタッフ',cart:'お買い物かご',scan:'レジ',bag:'レジ',receipt:'レジ',purchase:'お買い上げ',finish:timeOfDay==='day'?'東京の昼':'東京の夜'}[modal]||'');
  const profile=staffRoster[staff.profile];
  title.textContent=station?.name||({staff:profile&&profile.name+' · '+profile.origin+' 출신 직원',food:'구매한 음식',sleeper:'잠든 켄지',cart:'장바구니',scan:'계산대',bag:'봉투',receipt:'영수증',purchase:receipt?.printed?'영수증':'구매 내역',finish:'쇼핑 완료'}[modal]||'');
  const ids=cart.flatMap((n,id)=>n?[id]:[]);
  if(modal==='staff'){
    body.innerHTML=staffLine(announcement||'greeting')+'<div class="staff-options">'+
      '<button data-staff="recommend">야식 추천해 주세요</button>'+
      '<button data-staff="hot">따뜻한 프라이드치킨 주세요</button>'+
      '<button class="primary" data-staff="register">계산할게요</button></div>';
  }else if(station?.ids||modal==='cart'){
    const list=station?.ids||ids;
    body.innerHTML=(modal==='hot'?(announcement?staffLine(announcement):'<p>＋ 버튼으로 프라이드치킨을 주문할 수 있어요.</p>'):'')+
      (list.length?list.map(id=>row(id)).join(''):'<p>장바구니가 비어 있어요.</p>')+
      '<div class="panel-foot"><span>장바구니 합계</span><strong class="price">'+yen(total())+'</strong></div>'+
      (total()>wallet?'<p class="warning">지갑에서 '+yen(total()-wallet)+' 부족해요.</p>':'');
  }else if(modal==='register'){
    body.innerHTML=staffLine('register')+(ids.length?ids.map(id=>row(id)).join('')+
      '<div class="panel-foot"><strong>합계 '+yen(total())+'</strong><button class="primary" data-scan '+(total()>wallet?'disabled':'')+'>스캔 시작</button></div>'+
      (total()>wallet?'<p class="warning">'+yen(total()-wallet)+' 부족해요. 상품을 빼면 다시 계산할 수 있어요.</p>':''):
      '<p>계산할 상품을 장바구니에 담아 주세요.</p>');
  }else if(modal==='scan'){
    const complete=scanCount===scanItems.length;
    body.innerHTML='<p role="status">'+(complete?'스캔 완료. 금액을 확인해 주세요.':'상품을 스캔하고 있어요. '+scanCount+' / '+scanItems.length)+'</p><div class="receipt">'+
      scanItems.slice(0,scanCount).map(id=>'<div><span>'+products[id][0]+'</span><span>'+yen(products[id][2])+'</span></div>').join('')+'</div>'+
      '<div class="panel-foot"><strong>합계 '+yen(scanItems.slice(0,scanCount).reduce((sum,id)=>sum+products[id][2],0))+'</strong><button class="primary" data-pay '+(complete?'':'disabled')+'>결제하기</button></div>';
    if(!complete)body.scrollTop=body.scrollHeight;
  }else if(modal==='bag'||modal==='receipt'){
    const bag=modal==='bag';
    body.innerHTML=staffLine(modal)+'<div class="staff-options">'+
      '<button class="primary" data-answer="yes">'+(bag?'봉투 주세요':'영수증 주세요')+'</button>'+
      '<button data-answer="no">괜찮아요</button></div>';
  }else if(modal==='purchase'||modal==='finish'){
    const bag=receipt.bag?'봉투 받음':'봉투 생략';
    const ticket=receipt.printed?'영수증 받음':'영수증 생략';
    const heat=microwave.heated?' · 도시락 '+microwave.heated+'개 데움':'';
    body.innerHTML=(modal==='purchase'?staffLine('thanks'):'')+purchaseSummary()+
      '<div class="panel-foot"><span>'+bag+' · '+ticket+heat+'</span></div>'+
      (modal==='finish'?'<div class="finish-buttons"><button class="primary" data-food>구매한 음식</button><button data-done>밖 둘러보기</button><button data-restart>다시 시작</button></div>':
      '<div class="finish-buttons"><button class="primary" data-done>매장 둘러보기</button></div>');
  }else if(modal==='food'){
    body.innerHTML=foodView();
  }else if(modal==='sleeper'){
    body.innerHTML='<p>일본인 동네 주민 켄지가 술에 취해 매장 옆에 잠들어 있어요.</p>';
  }else if(modal==='microwave'){
    body.innerHTML=microwaveView();
  }
  body.querySelectorAll('[data-product]').forEach(c=>art(c.getContext('2d'),0,0,Number(c.dataset.product)));
  if(control)body.querySelector(control)?.focus({preventScroll:true});
}
function startMicrowave(){
  if(!inside||microwave.endsAt||microwave.ready||coldBento()<=0)return;
  heldFood[bentoId]--;
  hud();
  microwave.endsAt=performance.now()+6000;
  fx('click');
  if(audio)tone(94,audio.currentTime,6,.13,'triangle');
  microwave.timer=setTimeout(()=>{
    microwave.endsAt=0;
    microwave.timer=null;
    microwave.ready=true;
    fx('microwave');
    updateObjective();
    if(modal==='microwave')renderDialog();
  },6000);
  updateObjective();
  renderDialog();
}
function scanNext(){
  if(modal!=='scan')return;
  scanCount++;
  fx('scan');
  renderDialog();
  if(scanCount<scanItems.length)scanTimer=setTimeout(scanNext,340);
}
el('panel-body').onclick=e=>{
  const button=e.target.closest('button');
  if(!button||button.disabled)return;
  const data=button.dataset;
  if(data.add!==undefined||data.remove!==undefined){
    const id=Number(data.add??data.remove);
    const adding=data.add!==undefined;
    change(id,adding?1:-1);
    if(id===7&&adding){
      say(...staffLines.order);
      renderDialog('order');
    }else renderDialog();
  }else if(data.staff==='recommend'&&modal==='staff'){
    talk('recommend');
  }else if(data.staff==='hot'&&modal==='staff'){
    change(7,1);
    talk('order');
  }else if(data.staff==='register'&&modal==='staff'){
    openDialog('register');
    say(...staffLines.register);
  }else if('scan' in data&&modal==='register'&&total()>0&&total()<=wallet){
    scanItems=cart.flatMap((n,id)=>Array(n).fill(id));
    scanCount=0;
    openDialog('scan');
    scanTimer=setTimeout(scanNext,240);
  }else if('pay' in data&&modal==='scan'&&!receipt&&scanItems.length&&scanCount===scanItems.length&&total()<=wallet){
    startPayment();
  }else if(data.answer&&(modal==='bag'||modal==='receipt')){
    if(modal==='bag'){
      receipt.bag=data.answer==='yes';
      openCheckout();
    }else{
      receipt.printed=data.answer==='yes';
      updateObjective();
      openDialog('purchase');
      say(...staffLines.thanks);
    }
  }else if('heat' in data&&modal==='microwave'){
    startMicrowave();
  }else if('collect' in data&&modal==='microwave'&&microwave.ready){
    microwave.ready=false;
    microwave.heated++;
    heldFood[bentoId]++;
    warmBento++;
    hud();
    fx('click');
    updateObjective();
    renderDialog();
  }else if('food' in data&&receipt){
    openFood();
  }else if('eat' in data&&modal==='food'){
    eat(Number(data.eat));
  }else if('done' in data){
    closeDialog();
  }else if('restart' in data&&modal==='finish'){
    resetVisit();
  }
};
el('close').onclick=closeDialog;
el('overlay').onclick=e=>{if(e.target===el('overlay'))closeDialog();};
el('basket').onclick=()=>{if(!modal&&!mealMotion)receipt?openCheckout():openDialog('cart');};
el('food').onclick=()=>{if(!modal&&!mealMotion&&receipt)openFood();};
const timeButtons=document.querySelectorAll('[data-time-choice]');
for(const button of timeButtons){
  button.onclick=()=>{
    timeOfDay=button.dataset.timeChoice;
    const day=timeOfDay==='day';
    scene.parentElement.dataset.time=timeOfDay;
    el('visit-title').textContent=day?'한낮의':'자정의';
    el('visit-copy').textContent=day?'오늘은 뭘 먹을까?':'오늘 밤엔 뭘 먹을까?';
    for(const choice of timeButtons)choice.setAttribute('aria-pressed',String(choice===button));
  };
}
el('start').onclick=()=>{
  initAudio();
  started=true;
  el('intro').hidden=true;
  el('start').blur();
};
el('replay').onclick=resetVisit;

function resetVisit(){
  closeDialog();
  stopCrossingAudio();
  clearTimeout(microwave.timer);
  clearTimeout(captionTimer);
  music?.stop();
  music=null;
  spoken?.stop();
  spoken=null;
  speechSequence++;
  window.speechSynthesis?.cancel();
  keys.clear();
  touches.clear();
  lookPointer=null;
  started=inside=finished=false;
  wallet=1000;
  receipt=null;
  scanCount=0;
  scanItems=[];
  cart.fill(0);
  heldFood.fill(0);
  warmBento=0;
  foodResult='';
  mealMotion=null;
  el('meal-motion').hidden=el('meal-status').hidden=true;
  stopGuestLine();
  nextGuestLine=0;
  resetGuests();
  Object.assign(staff,{...staffSpawn,angle:0,step:0,station:null,at:null,idle:2});
  Object.assign(microwave,{heated:0,endsAt:0,timer:null,shownSeconds:null,ready:false});
  Object.assign(player,spawn);
  hud();
  el('caption').hidden=true;
  el('minimap').hidden=true;
  el('basket').disabled=true;
  el('replay').hidden=true;
  el('location').textContent='매장 앞';
  el('objective').textContent='자동문까지 앞으로 이동하세요';
  el('intro').hidden=false;
  el('start').focus({preventScroll:true});
}

function enter(){
  stopGuestLine();
  const otherProfiles=staffRoster.map((_,i)=>i).filter(i=>i!==staff.profile);
  const profile=otherProfiles[Math.floor(Math.random()*otherProfiles.length)];
  Object.assign(staff,{...staffSpawn,profile,angle:0,step:0,station:null,at:null,idle:2});
  visitCount++;
  resetGuests();
  inside=true;
  Object.assign(player,{x:320,y:422,angle:0,pitch:0});
  el('location').textContent='패밀리마트 매장';
  el('objective').textContent='매대를 보거나 계산대 직원에게 말을 걸어 보세요';
  el('basket').disabled=false;
  el('minimap').hidden=false;
  playEntry();
  startMusic();
  say('いらっしゃいませ！','어서 오세요!');
}
function leave(){
  if(receipt?.printed===null||microwave.endsAt||microwave.ready){
    updateObjective();
    player.y=438;
    return;
  }
  inside=false;
  stopGuestLine();
  nextGuestLine=performance.now()+2200;
  finished=Boolean(receipt);
  music?.stop();
  music=null;
  el('minimap').hidden=true;
  el('basket').disabled=!receipt;
  el('location').textContent=timeOfDay==='day'?'도쿄의 낮 · 매장 앞':'도쿄의 밤 · 매장 앞';
  el('objective').textContent=finished?'쇼핑 완료 · 밖을 둘러보거나 다시 시작하세요':'자동문을 통과해 다시 들어갈 수 있어요';
  el('replay').hidden=!finished;
  Object.assign(player,finished?{x:320,y:463,angle:.15,pitch:.12,step:0}:{x:320,y:321,angle:Math.PI,pitch:0,step:0});
  fx('door');
  if(finished)openDialog('finish');
}
function canWalk(x,y){
  if(!inside)return x>=35&&x<=605&&y<=480&&(y>=303||(!finished&&y>=280&&x>281&&x<359))&&
    (timeOfDay==='day'||Math.hypot(x-sleeper.x,y-sleeper.y)>=15)&&Math.hypot(x-crossing.x,y-crossing.y)>=7;
  if(Math.hypot(x-staff.x,y-staff.y)<15)return false;
  return x>=35&&x<=605&&y>=42&&y<=450&&(y<=432||(x>286&&x<354))&&fixtures.every(r=>x+7<=r.x||x-7>=r.x+r.w||y+7<=r.y||y-7>=r.y+r.h);
}
function stationNear(){
  if(modal||mealMotion)return null;
  if(!inside){
    if(timeOfDay==='day')return null;
    const dx=sleeper.x-player.x, dy=sleeper.y-player.y;
    const distance=Math.hypot(dx,dy);
    return distance<57&&Math.sin(player.angle)*dx-Math.cos(player.angle)*dy>distance*.4?sleeper:null;
  }
  let best=null,score=Infinity;
  if(Math.abs(player.x-exit.x)<35&&player.y>394&&Math.cos(player.angle)<-.4)return exit;
  for(const s of stations){
    if(receipt&&s.id!=='register'&&s.id!=='microwave')continue;
    const below=player.y>=s.y+s.h;
    if(!below&&(s.side!=='both'||player.y>s.y))continue;
    const targetX=Math.max(s.x+4,Math.min(player.x,s.x+s.w-4));
    const dx=targetX-player.x;
    const dy=(below?s.y+s.h:s.y)-player.y;
    const distance=Math.hypot(dx,dy);
    const facing=(Math.sin(player.angle)*dx-Math.cos(player.angle)*dy)/Math.max(1,distance);
    const priority=distance+(1-facing)*18;
    if(distance<=69&&facing>.33&&priority<score){best=s;score=priority;}
  }
  return best;
}
const staffStops={register:{x:530,y:142},hot:{x:447,y:141}};
function serve(station){
  if(station==='register')openCheckout();
  else openDialog('hot');
}
function summon(station){
  if(staff.at===station){serve(station);return;}
  if(staff.station===station)return;
  staff.station=station;
  staff.at=null;
  fx('call');
  say(...staffLines.coming);
}
function moveStaff(dt){
  const destination=staffStops[staff.station]||staffSpawn;
  if(staff.at){
    if(modal||stationNear()?.id===staff.at)return;
    staff.idle-=dt;
    if(staff.idle>0)return;
    staff.at=null;
  }
  const dx=destination.x-staff.x,dy=destination.y-staff.y;
  const distance=Math.hypot(dx,dy);
  const step=74*dt;
  if(distance>step&&distance>0){
    staff.angle=Math.atan2(dx,dy);
    staff.x+=dx/distance*step;
    staff.y+=dy/distance*step;
    staff.step+=dt*12;
    return;
  }
  staff.x=destination.x;
  staff.y=destination.y;
  staff.step=0;
  staff.angle=0;
  if(!staff.station)return;
  staff.at=staff.station;
  staff.station=null;
  staff.idle=3;
  if(stationNear()?.id===staff.at)serve(staff.at);
}
function interact(){
  if(!started||mealMotion)return;
  if(modal){closeDialog();return;}
  const station=stationNear();
  if(!station)return;
  if(staffStops[station.id])receipt?openCheckout():summon(station.id);
  else if(station.id==='exit')leave();
  else openDialog(station.id);
}
const directions={arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'turnLeft',a:'left',arrowright:'turnRight',d:'right'};
let lookPointer=null;
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(!started)return;
  if(directions[k]&&!modal){e.preventDefault();keys.add(directions[k]);}
  if(k==='e'&&!e.repeat){e.preventDefault();interact();}
  if(k==='escape'){e.preventDefault();closeDialog();}
});
window.addEventListener('keyup',e=>keys.delete(directions[e.key.toLowerCase()]));
window.addEventListener('blur',()=>{keys.clear();touches.clear();lookPointer=null;});
scene.onpointerdown=e=>{
  if(!started||modal||lookPointer)return;
  scene.setPointerCapture(e.pointerId);
  lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};
};
scene.onpointermove=e=>{
  if(lookPointer?.id!==e.pointerId||modal)return;
  player.angle+=(e.clientX-lookPointer.x)*.008;
  player.pitch=Math.max(-.45,Math.min(.45,player.pitch-(e.clientY-lookPointer.y)*.006));
  lookPointer.x=e.clientX;
  lookPointer.y=e.clientY;
};
scene.onpointerup=scene.onpointercancel=scene.onlostpointercapture=e=>{
  if(lookPointer?.id===e.pointerId)lookPointer=null;
};
for(const b of document.querySelectorAll('[data-dir]')){
  b.onpointerdown=e=>{
    if(!started||modal||mealMotion)return;
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    touches.set(e.pointerId,b.dataset.dir);
  };
  b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>touches.delete(e.pointerId);
}
el('action').onclick=interact;

const map=el('minimap').getContext('2d');
function moveGuests(dt){
  for(const g of guests){
    if(g.inside!==inside)continue;
    if(g.pause>0){g.pause-=dt;continue;}
    const [x,y]=g.points[g.point];
    const dx=x-g.x,dy=y-g.y;
    const distance=Math.hypot(dx,dy);
    const step=35*dt;
    if(distance>step){
      g.x+=dx/distance*step;
      g.y+=dy/distance*step;
      g.angle=Math.atan2(dx,dy);
      g.step+=dt*10;
    }else{
      g.x=x;
      g.y=y;
      g.step=0;
      g.point=(g.point+1)%g.points.length;
      g.pause=2;
    }
  }
}
function stopGuestLine(){
  pendingGuest=null;
  if(guestAudio){
    const {source}=guestAudio;
    guestAudio=null;
    source.stop();
  }
  el('guest-caption').hidden=true;
}
function updateGuestAudio(ms){
  if(!audio||muted||!started||modal||mealMotion)return;
  const distance=g=>Math.hypot(g.x-player.x,g.y-player.y);
  if(guestAudio){
    const {guest,gain,pan}=guestAudio;
    const dx=guest.x-player.x,dy=guest.y-player.y;
    const lateral=dx*Math.cos(player.angle)+dy*Math.sin(player.angle);
    gain.gain.value=.45*Math.max(0,1-distance(guest)/230);
    if(pan)pan.pan.value=Math.max(-.9,Math.min(.9,lateral/100));
    return;
  }
  if(pendingGuest||ms<nextGuestLine)return;
  const guest=guests.filter(g=>g.inside===inside&&g.nextLine<=ms&&distance(g)<180)
    .sort((a,b)=>distance(a)-distance(b))[0];
  if(!guest)return;
  nextGuestLine=ms+4800;
  guest.nextLine=ms+15500;
  const request={guest};
  pendingGuest=request;
  Promise.resolve(voices?.[guest.clip]).then(buffer=>{
    if(pendingGuest!==request)return;
    pendingGuest=null;
    if(!buffer||muted||modal||mealMotion||inside!==guest.inside||distance(guest)>=180)return;
    const source=audio.createBufferSource(), gain=audio.createGain();
    const pan=audio.createStereoPanner?.();
    source.buffer=buffer;
    source.connect(gain);
    if(pan)gain.connect(pan).connect(master);
    else gain.connect(master);
    guestAudio={source,gain,pan,guest};
    updateGuestAudio(ms);
    const caption=el('guest-caption');
    const translation=document.createElement('small');
    translation.textContent=guest.ko;
    caption.replaceChildren(document.createTextNode(guest.name+' · '+guest.jp),translation);
    caption.hidden=false;
    source.onended=()=>{
      if(guestAudio?.source!==source)return;
      guestAudio=null;
      caption.hidden=true;
    };
    source.start();
  });
}
function drawMap(){
  map.clearRect(0,0,138,97);
  const scale=.208;
  map.fillStyle='#c1cccb';
  map.fillRect(4,4,130,89);
  map.fillStyle='#203d4d';
  map.fillRect(6,6,126,85);
  for(const s of fixtures){
    map.fillStyle=({meals:'#67c49c',dessert:'#c889a5',drinks:'#76bce0',hot:'#e5a555',register:'#e5c981',microwave:'#bf99ee'})[s.id]||'#577380';
    map.fillRect((s.x-18)*scale+7,(s.y-30)*scale+6,s.w*scale,s.h*scale);
  }
  map.fillStyle='#7ef6bb';
  map.fillRect(64,91,14,2);
  const x=(player.x-18)*scale+7,y=(player.y-30)*scale+6;
  map.save();
  map.translate(x,y);
  map.rotate(player.angle);
  map.fillStyle='#ffffff';
  map.beginPath();map.moveTo(0,-5);map.lineTo(3.5,4);map.lineTo(0,2);map.lineTo(-3.5,4);map.closePath();map.fill();
  map.restore();
}
function stopCrossingAudio(){
  if(!crossingAudio)return;
  crossingAudio.source.stop();
  crossingAudio=null;
}
function updateCrossing(time){
  const green=time%14000<7200;
  const dx=crossing.x-player.x,dy=crossing.y-player.y;
  const distance=Math.hypot(dx,dy);
  if(!green||!started||inside||muted||distance>=170||!crossingBuffer){
    stopCrossingAudio();
    return green;
  }
  if(!crossingAudio){
    const source=audio.createBufferSource();
    const gain=audio.createGain();
    const pan=audio.createStereoPanner?.();
    source.buffer=crossingBuffer;
    source.loop=true;
    source.connect(gain);
    if(pan)gain.connect(pan).connect(master);
    else gain.connect(master);
    crossingAudio={source,gain,pan};
    source.start();
  }
  const {gain,pan}=crossingAudio;
  gain.gain.value=.48*(1-distance/170);
  if(pan)pan.pan.value=Math.max(-.85,Math.min(.85,(dx*Math.cos(player.angle)+dy*Math.sin(player.angle))/125));
  return green;
}
let previous=0;
function frame(time){
  const dt=Math.min((time-previous)/1000,.035);
  previous=time;
  if(started&&!modal&&!mealMotion){
    const held=new Set([...keys,...touches.values()]);
    const side=Number(held.has('right'))-Number(held.has('left'));
    const forward=Number(held.has('up'))-Number(held.has('down'));
    const turn=Number(held.has('turnRight'))-Number(held.has('turnLeft'));
    player.angle+=turn*dt*2.35;
    if(side||forward){
      const speed=135*dt/(side&&forward?Math.SQRT2:1);
      const dx=(Math.cos(player.angle)*side+Math.sin(player.angle)*forward)*speed;
      const dy=(Math.sin(player.angle)*side-Math.cos(player.angle)*forward)*speed;
      if(canWalk(player.x+dx,player.y))player.x+=dx;
      if(canWalk(player.x,player.y+dy))player.y+=dy;
      player.step+=dt*15;
      if(!inside&&!finished&&player.y<294&&player.x>281&&player.x<359)enter();
      else if(inside&&player.y>444)leave();
    }else player.step=0;
  }
  if(inside)moveStaff(dt);
  if(started)moveGuests(dt);
  updateGuestAudio(time);
  const walkSignal=updateCrossing(time);
  renderScene?.(player,inside,started,microwave.endsAt>0,timeOfDay,finished,staff,guests,sleeper,time,walkSignal);
  animateMeal(time);
  animatePayment(time);
  if(modal==='microwave'&&microwave.endsAt){
    const seconds=Math.max(0,Math.ceil((microwave.endsAt-performance.now())/1000));
    if(seconds!==microwave.shownSeconds){
      microwave.shownSeconds=seconds;
      el('heat-clock').textContent='0:0'+seconds;
    }
  }
  if(inside)drawMap();
  el('crosshair').hidden=!started||Boolean(modal);
  nearby=started&&!mealMotion?stationNear():null;
  const prompt=el('prompt');
  prompt.hidden=!nearby;
  const action=el('action');
  action.disabled=Boolean(paymentMotion)||(!nearby&&!modal);
  const staffId=nearby?.id;
  const verb=staffStops[staffId]&&!receipt
    ?staff.station===staffId?staffRoster[staff.profile].name+' · 오는 중':staff.at===staffId?(staffId==='hot'?'주문하기':'직원과 대화'):'직원 호출'
    :({register:'구매 내역',microwave:'전자레인지 사용',exit:'매장 나가기',sleeper:'살펴보기'})[staffId]||'둘러보기';
  const actionText=modal?'닫기':nearby?verb:'상호작용';
  if(action.textContent!==actionText)action.textContent=actionText;
  if(nearby){
    if(prompt.dataset.verb!==verb){prompt.innerHTML='<kbd>E</kbd> '+verb;prompt.dataset.verb=verb;}
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
