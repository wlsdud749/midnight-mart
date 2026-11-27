'use strict';

window.drawMealMotion=function drawMealMotion(canvas,product,progress){
  const g=canvas.getContext('2d');
  const [,,,type,color]=product;
  const drink=type==='bottle'||type==='cup';
  const lift=Math.min(1,progress/.34,(1-progress)/.27);
  const reach=lift*lift*(3-2*lift);
  const bite=progress>.44&&progress<.75?Math.sin((progress-.44)*39)*2.6:0;
  g.clearRect(0,0,640,440);
  g.save();
  g.scale(2,2);
  g.translate(196-36*reach,242-160*reach+bite);
  g.rotate((-0.22+(drink?1.1:.27)*reach));
  function shape(fill,draw){
    g.beginPath();
    draw();
    g.fillStyle=fill;
    g.fill();
  }
  function oval(x,y,rx,ry,fill){
    shape(fill,()=>g.ellipse(x,y,rx,ry,0,0,Math.PI*2));
  }
  function box(x,y,w,h,r,fill){
    shape(fill,()=>g.roundRect(x,y,w,h,r));
  }
  const skin=g.createLinearGradient(5,10,74,110);
  skin.addColorStop(0,'#f0bd95');
  skin.addColorStop(1,'#b77559');
  shape(skin,()=>{
    g.moveTo(-7,30);g.quadraticCurveTo(-1,14,15,18);g.quadraticCurveTo(30,14,40,26);
    g.bezierCurveTo(49,44,43,68,59,88);g.lineTo(108,153);g.lineTo(62,175);
    g.lineTo(26,100);g.bezierCurveTo(5,75,-16,56,-7,30);g.closePath();
  });
  shape('#304459',()=>{
    g.moveTo(48,97);g.lineTo(66,84);g.lineTo(151,177);g.lineTo(83,198);g.closePath();
  });
  if(drink){
    const bottle=type==='bottle';
    box(-19,-39,39,81,9,bottle?'#627c39':'#cf9f78');
    box(-15,-29,4,63,2,'#ffffff4c');
    box(-20,-12,41,29,4,bottle?'#f0ebc9':'#f5eee5');
    box(-8,-45,16,9,3,bottle?'#deddb1':'#4a3429');
    g.fillStyle=bottle?'#36532d':'#684934';
    g.font='bold 8px sans-serif';
    g.textAlign='center';
    g.fillText(bottle?'緑茶':'LATTE',0,6);
  }else if(type==='rice'){
    shape('#f7f0d8',()=>{
      g.moveTo(-28,23);g.quadraticCurveTo(-16,-9,-6,-24);g.quadraticCurveTo(0,-32,6,-24);
      g.quadraticCurveTo(19,-11,28,23);g.quadraticCurveTo(0,35,-28,23);
    });
    box(-16,7,32,21,4,'#304536');
  }else if(type==='bento'){
    box(-48,0,87,40,8,'#303339');
    box(-43,3,77,30,5,'#423334');
    oval(-26,17,15,10,'#f2e5c8');
    oval(4,13,9,7,'#d78c53');
    oval(20,18,9,8,'#ad6034');
    oval(7,23,8,6,'#c67845');
    g.save();g.rotate(-.37);
    box(-6,-30,5,66,2,'#c7a57d');box(2,-30,5,66,2,'#e9c99f');
    g.restore();
  }else{
    oval(0,1,28,23,type==='chicken'?'#9e4d27':color);
    oval(-4,-4,22,16,type==='chicken'?'#d88a47':color);
    if(type==='bun')box(-23,4,46,5,3,'#fff2bd');
    if(type==='pudding')oval(0,-12,20,7,'#ab632f');
    if(type==='chicken')box(12,14,14,18,6,'#f0d5a5');
  }
  oval(14,35,11,8,'#edb48b');
  g.restore();
};

window.drawPaymentMotion=function drawPaymentMotion(canvas,amount,progress){
  const g=canvas.getContext('2d');
  const cash=[];
  let remainder=amount;
  for(const denomination of [1000,500,100,50,10,5,1]){
    while(remainder>=denomination){
      cash.push(denomination);
      remainder-=denomination;
    }
  }
  const release=.52, deposited=progress>=release;
  const ease=value=>value*value*(3-2*value);
  const arrival=ease(Math.min(1,progress/release));
  const retreat=deposited?ease((progress-release)/(1-release)):0;
  const drift=1-arrival+retreat;
  const fall=deposited?Math.max(0,1-(progress-release)/.19)**2:0;
  g.clearRect(0,0,640,440);
  g.save();
  g.scale(2,2);
  function box(x,y,w,h,r,fill){
    g.beginPath();
    g.roundRect(x,y,w,h,r);
    g.fillStyle=fill;
    g.fill();
  }
  box(39,100,242,108,17,'#162634');
  box(43,101,234,101,15,'#90a4ab');
  box(50,108,220,85,11,'#405b64');
  box(56,112,208,77,9,'#385059');
  for(let y=122;y<190;y+=10)box(62,y,196,1,1,'#49646d');
  g.fillStyle='#b5d4dc';
  g.font='700 9px system-ui';
  g.textAlign='center';
  g.fillText('お会計トレー',160,184);
  g.save();
  g.translate(161+153*drift,142+102*drift);
  g.rotate(-.16+.38*drift);
  const skin=g.createLinearGradient(-4,-17,32,36);
  skin.addColorStop(0,'#f5c5a0');
  skin.addColorStop(1,'#ae765e');
  box(21,2,103,35,11,'#3b526c');
  box(12,0,19,39,6,'#536b84');
  box(-16,-6,48,34,13,skin);
  for(let i=0;i<4;i++)box(-40+i*2,-8+i*8,33,8,4,skin);
  box(-9,17,22,12,6,'#e9b28f');
  g.restore();
  const paymentX=deposited?153:135+154*(1-arrival);
  const paymentY=deposited?148-23*fall:127+100*(1-arrival);
  cash.forEach((value,i)=>{
    const x=paymentX+(i%5-2)*22,y=paymentY+Math.floor(i/5)*22;
    g.save();
    g.translate(x,y);
    g.rotate((i%3-1)*.14);
    g.textAlign='center';
    if(value===1000){
      box(-39,-15,83,38,4,'#9fae99');
      box(-36,-13,77,33,3,'#cbd5b3');
      box(-33,-9,72,25,2,'#b8c9a7');
      g.fillStyle='#506b60';
      g.font='700 12px system-ui';
      g.fillText('1000',4,8);
    }else{
      const copper=value===10;
      const gold=value===500||value===5;
      for(const [dy,radius,color] of [[2,11,'#695d56'],[0,11,copper?'#c07f55':gold?'#d7be77':'#c7d1d3'],[0,8.5,copper?'#9e5e41':gold?'#a7894c':'#8b9a9f']]){
        g.beginPath();g.ellipse(0,dy,radius,radius*.81,0,0,Math.PI*2);g.fillStyle=color;g.fill();
      }
      g.fillStyle=copper?'#ffcf9e':'#f7f1da';
      g.font='700 7px system-ui';
      g.fillText(String(value),0,2.5);
    }
    g.restore();
  });
  g.restore();
};
