'use strict';

window.martProducts=[
  ['홍연어 주먹밥','手巻 紅しゃけ',180,'rice','#d57748'],
  ['시치킨 마요네즈 주먹밥','手巻 シーチキン®マヨネーズ',160,'rice','#79b4ce'],
  ['일본식 양파 소스 가라아게 도시락','和風玉ねぎソースの鶏から揚げ弁当',580,'bento','#ba733e'],
  ['파미마루 녹차 600ml','にごりの旨み 緑茶 600ml',130,'bottle','#b1a340'],
  ['무가당 카페라테 300ml','カフェラテ 砂糖不使用 300ml',190,'cup','#ab8767'],
  ['가마에서 구운 사르르 푸딩','窯出しとろけるプリン',230,'pudding','#e4bc71'],
  ['진한 바닐라 커스터드 슈','バニラたっぷり！濃厚カスタードシュー',200,'bun','#cb883a'],
  ['파미치키','ファミチキ',250,'chicken','#d68b45'],
  ['삿포로 비어 서프라이즈 350ml','サッポロ ビアサプライズ コクの神髄 350ml',269,'can','#711f2a']
];
window.isMartDrink=product=>['bottle','cup','can'].includes(product[3]);

window.drawProductArt=function drawProductArt(g,id){
  const [, , ,type,color]=window.martProducts[id];
  const W=128;
  g.save();
  function shape(fill,draw){
    g.beginPath();draw();g.fillStyle=fill;g.fill();
  }
  function rect(x,y,w,h,r,fill){shape(fill,()=>g.roundRect(x,y,w,h,r));}
  function oval(x,y,rx,ry,fill){shape(fill,()=>g.ellipse(x,y,rx,ry,0,0,Math.PI*2));}
  function light(x,y,X,Y,stops){
    const gradient=g.createLinearGradient(x,y,X,Y);
    stops.forEach(([offset,tint])=>gradient.addColorStop(offset,tint));
    return gradient;
  }
  function text(label,x,y,size,fill='#272724',max=100){
    g.font='700 '+size+'px system-ui,sans-serif';
    g.textAlign='center';g.fillStyle=fill;g.fillText(label,x,y,max);
  }
  function grains(count,x,y,w,h,colors,size){
    for(let i=0;i<count;i++){
      const px=x+w*((i*71+19)%997)/997, py=y+h*((i*149+47)%991)/991;
      oval(px,py,size*(.4+(i%7)/10),size*(.4+(i%5)/10),colors[i%colors.length]);
    }
  }
  function mark(x,y){oval(x,y,4,4,'#2b8b95');oval(x,y,2.7,2.7,'#64a46e');}
  const shadow=g.createRadialGradient(64,109,3,64,109,52);
  shadow.addColorStop(0,'#18202c48');shadow.addColorStop(1,'#18202c00');
  oval(64,109,52,13,shadow);
  if(type==='rice'){
    const nori=light(18,25,109,102,[[0,'#686954'],[.4,'#333d2a'],[1,'#1b2824']]);
    g.save();
    shape(nori,()=>{g.moveTo(57,12);g.quadraticCurveTo(64,3,72,14);g.lineTo(113,97);g.quadraticCurveTo(118,110,106,112);g.lineTo(22,112);g.quadraticCurveTo(10,108,16,96);g.closePath();});
    g.clip();
    grains(330,12,11,106,104,['#e2ddb32a','#949c6b52','#252d216e'],1.7);
    g.strokeStyle='#ffffe89c';g.lineWidth=3;
    g.beginPath();g.moveTo(22,104);g.lineTo(63,13);g.lineTo(109,102);g.stroke();
    rect(36,49,56,47,9,'#f1eee4');
    rect(36,87,56,9,3,color);
    text('ふわうま',64,43,10,'#f9f1db');
    mark(43,58);
    text(id===0?'紅しゃけ':'シーチキン',66,68,10);
    text(id===0?'手巻':'マヨネーズ',66,81,8);
    g.restore();
    rect(60,13,9,17,2,'#eeeee7');
    text('1',64.5,24,7);
  }else if(type==='bento'){
    g.translate(3,7);
    g.transform(1,.09,-.12,1,12,-7);
    rect(3,26,110,76,10,'#27282a');
    rect(6,27,104,69,9,'#5d5d57');
    rect(10,31,96,61,7,'#282925');
    rect(14,35,86,25,7,'#f3ebd4');
    grains(220,17,38,80,19,['#fff7ea','#e9d8bf','#fffdf4','#514539'],1.9);
    for(const [x,y] of [[45,75],[57,71],[69,78],[83,69],[92,80]])oval(x,y,12,9,light(x,y-9,x,y+8,[[0,'#eab16b'],[.45,'#b96933'],[1,'#78391d']]));
    grains(82,34,66,63,21,['#eabb75','#dc894e','#945027','#ffce8669'],1.5);
    oval(22,78,8,9,'#c95731');
    rect(64,33,32,13,2,'#faf4e879');
    text('鶏から揚げ',80,42,6,'#34332f');
  }else if(type==='bottle'){
    const tea=light(41,0,87,0,[[0,'#9a7c27'],[.27,'#e5bc4f'],[.6,'#c49f31'],[1,'#896b27']]);
    shape(tea,()=>{g.moveTo(50,21);g.lineTo(78,21);g.quadraticCurveTo(87,28,89,35);g.lineTo(89,102);g.quadraticCurveTo(88,113,77,115);g.lineTo(50,115);g.quadraticCurveTo(38,114,38,101);g.lineTo(38,35);g.quadraticCurveTo(42,25,50,21);});
    rect(53,10,22,11,3,'#f6f2e6');
    for(let x=55;x<75;x+=3)rect(x,12,1,7,0,'#d8d8cf');
    rect(38,39,51,40,3,'#c6c670');
    oval(64,57,21,17,'#f2eed7');
    mark(64,48);text('緑茶',64,65,13);rect(38,73,51,6,1,'#55563c');text('600ml',64,78,5,'#ffffff');
    for(let y=84;y<=105;y+=6)rect(43,y,41,1.3,1,'#f8e69b64');
  }else if(type==='cup'){
    shape(light(35,0,92,0,[[0,'#938073'],[.25,'#e7ded8'],[.64,'#bfa38c'],[1,'#7e6655']]),()=>{
      g.moveTo(30,21);g.lineTo(98,21);g.lineTo(88,108);g.quadraticCurveTo(64,114,40,108);g.closePath();
    });
    oval(64,22,35,4,'#35241f');
    rect(41,38,46,54,10,'#ece7dc');
    mark(64,47);text('カフェラテ',64,63,9);text('Caffè Latte',64,72,6);
    rect(47,76,34,8,3,'#173d69');text('砂糖不使用',64,82,5,'#ffffff');text('300ml',73,101,7,'#251c19');
  }else if(type==='can'){
    const metal=light(36,0,91,0,[[0,'#481c25'],[.19,'#a43440'],[.62,'#761b2d'],[1,'#421724']]);
    shape(metal,()=>{
      g.moveTo(43,18);g.lineTo(85,18);g.quadraticCurveTo(92,24,92,32);
      g.lineTo(92,105);g.quadraticCurveTo(89,113,82,114);g.lineTo(46,114);
      g.quadraticCurveTo(36,112,36,105);g.lineTo(36,33);g.quadraticCurveTo(36,24,43,18);
    });
    oval(64,18,23,4,'#e0c373');oval(64,17,20,2,'#f5e1a5');
    oval(64,108,25,2,'#c4c0b5');
    oval(64,63,22,37,'#a64235');
    for(let i=0;i<12;i++){
      const a=2*Math.PI*i/12;
      oval(64+19*Math.cos(a),63+32*Math.sin(a),1.7,2.7,'#d4a75e');
    }
    shape('#efd592',()=>{
      for(let i=0;i<10;i++){
        const a=Math.PI*i/5-Math.PI/2, radius=i%2?3.3:8;
        const x=64+Math.cos(a)*radius,y=39+Math.sin(a)*radius;
        if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
      }
    });
    text('SAPPORO',64,52,6.5,'#f3dca6');
    rect(38,56,52,20,1,'#ca8c53');
    text('BEER SURPRISE',64,64,6,'#4e2330',48);
    text('コクの神髄',64,72,8,'#ffe5ac');
    text('Premium',64,88,8,'#f4d493');
    text('350ml',64,101,6,'#e5c58d');
  }else if(type==='pudding'){
    shape(light(38,0,89,0,[[0,'#c6a06c'],[.42,'#f6d891'],[1,'#d3a35e']]),()=>{
      g.moveTo(31,46);g.lineTo(97,46);g.lineTo(87,99);g.quadraticCurveTo(64,114,41,99);g.closePath();
    });
    oval(64,98,23,7,'#7c492e');oval(64,48,34,14,'#ebd7a0');oval(64,49,30,10,'#f8dda0');
    g.strokeStyle='#ffffff8c';g.lineWidth=2;g.beginPath();g.ellipse(64,45,35,14,0,0,Math.PI*2);g.stroke();
    rect(38,65,52,20,4,'#f6edcd');text('窯出し',64,73,6);text('とろけるプリン',64,82,7);
  }else if(type==='bun'){
    oval(64,73,49,29,'#f7e5bd');
    oval(64,67,35,28,light(45,43,82,91,[[0,'#f3c46a'],[.54,'#c88034'],[1,'#865024']]));
    g.save();g.clip();
    grains(280,28,39,68,50,['#efb85c','#a66030','#f7ce87','#d5883c'],2.4);
    g.restore();
    oval(64,74,22,14,'#f6dd8d');oval(60,71,18,10,'#ffedaa');
    grains(24,48,65,30,16,['#ad9149','#c8ad63'],.65);
  }else{
    rect(34,19,63,68,14,light(38,18,93,92,[[0,'#f6b558'],[.53,'#c8732b'],[1,'#a65322']]));
    g.save();g.clip();
    grains(460,34,19,63,69,['#e9973a','#f9bc54','#af6024','#d1782f'],1.9);
    g.restore();
    rect(20,65,89,43,3,'#fff8eb');
    g.save();g.clip();
    for(let x=0;x<135;x+=16){
      shape(x%32?'#ecc943':'#d44838',()=>{g.moveTo(x,66);g.lineTo(x+8,66);g.lineTo(x-20,108);g.lineTo(x-28,108);g.closePath();});
    }
    rect(20,80,89,14,0,'#fff8ea');g.restore();text('FAMICHIKI',64,90,10,'#c43c31');
  }
  g.restore();
};
