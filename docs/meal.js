'use strict';

window.drawCarryMotion=function drawCarryMotion(canvas,time,step,raisedAt){
  const g=canvas.getContext('2d');
  const settle=Math.min(1,Math.max(0,(time-raisedAt)/620));
  const lift=(1-settle)**3;
  const swing=Math.sin(step), bounce=Math.cos(step*2);
  g.clearRect(0,0,520,380);
  g.save();
  g.scale(2,2);
  g.translate(149+swing*7,55+lift*145+(step?bounce*3:0)+Math.sin(time/760)*1.2);
  g.rotate(.12+swing*.095);
  function fill(paint,draw){
    g.beginPath();draw();g.fillStyle=paint;g.fill();
  }
  function gradient(x,y,endX,endY,stops){
    const paint=g.createLinearGradient(x,y,endX,endY);
    for(const [at,color] of stops)paint.addColorStop(at,color);
    return paint;
  }
  const plastic=gradient(-60,34,50,136,[[0,'#f2f5edee'],[.43,'#fffaf0f2'],[1,'#a6b7bddc']]);
  fill(plastic,()=>{
    g.moveTo(-49,41);g.quadraticCurveTo(-45,16,-28,9);
    g.lineTo(-17,6);g.quadraticCurveTo(-36,26,-32,43);
    g.quadraticCurveTo(-14,49,2,43);g.quadraticCurveTo(6,23,-6,10);
    g.lineTo(7,9);g.quadraticCurveTo(24,18,27,44);
    g.lineTo(42,103);g.quadraticCurveTo(43,126,31,137);
    g.quadraticCurveTo(-3,149,-38,137);g.quadraticCurveTo(-57,128,-57,109);
    g.closePath();
  });
  g.strokeStyle='#ffffff9c';g.lineWidth=1.6;g.beginPath();
  g.moveTo(-46,53);g.quadraticCurveTo(-40,86,-48,121);
  g.moveTo(31,62);g.quadraticCurveTo(18,95,33,129);g.stroke();
  fill('#89a2ac40',()=>{
    g.moveTo(-52,120);g.quadraticCurveTo(-6,137,37,116);
    g.quadraticCurveTo(32,143,-3,143);g.quadraticCurveTo(-32,144,-52,120);
  });
  g.save();g.rotate(-.035);
  g.fillStyle='#50a977';g.fillRect(-38,78,62,3);
  g.fillStyle='#5089b2';g.fillRect(-38,101,62,3);
  g.fillStyle='#276388';g.font='750 10px system-ui,sans-serif';g.textAlign='center';g.fillText('FamilyMart',-7,95);
  g.restore();
  fill('#34495d',()=>{
    g.moveTo(18,-21);g.lineTo(130,-54);g.lineTo(161,-13);g.lineTo(29,21);g.closePath();
  });
  fill('#47617a',()=>g.roundRect(20,-23,19,46,7));
  const skin=gradient(-18,-11,23,26,[[0,'#e8b28b'],[.45,'#edbd99'],[1,'#a96f57']]);
  fill(skin,()=>{
    g.moveTo(25,-13);g.quadraticCurveTo(7,-13,-4,-18);
    g.quadraticCurveTo(-20,-22,-24,-7);g.lineTo(-23,12);
    g.quadraticCurveTo(-17,23,-2,22);g.lineTo(24,12);g.closePath();
  });
  for(let i=0;i<4;i++)fill(i%2?'#d79775':'#e6ad87',()=>g.roundRect(-25+i*7,-4,7,21,3.5));
  fill('#e5ac86',()=>g.roundRect(1,-9,14,11,4));
  g.restore();
};

const motionPackshots=new Map();
function motionPackshot(product){
  if(!motionPackshots.has(product)){
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=128;
    window.drawProductArt(canvas.getContext('2d'),window.martProducts.indexOf(product));
    motionPackshots.set(product,canvas);
  }
  return motionPackshots.get(product);
}
window.drawMealMotion=function drawMealMotion(canvas,product,progress){
  const g=canvas.getContext('2d');
  const [,,,type,color]=product;
  const drink=window.isMartDrink(product);
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
  if(drink||type==='chicken'){
    g.drawImage(motionPackshot(product),-54,-48,108,108);
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
    oval(0,1,28,23,color);
    oval(-4,-4,22,16,color);
    if(type==='bun')box(-23,4,46,5,3,'#fff2bd');
    if(type==='pudding')oval(0,-12,20,7,'#ab632f');
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
