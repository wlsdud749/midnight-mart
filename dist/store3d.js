'use strict';

window.createStoreView = function createStoreView(canvas, stations, products) {
  const gl = canvas.getContext('webgl', {antialias:true,alpha:false});
  if (!gl) return null;
  const program = gl.createProgram();
  const shaders = [
    [gl.VERTEX_SHADER, `
      attribute vec3 point;
      attribute vec3 color;
      attribute vec2 uv;
      uniform vec3 eye;
      uniform vec2 heading;
      uniform vec2 tilt;
      uniform vec2 scale;
      uniform vec3 modelOffset;
      uniform vec2 modelTurn;
      uniform float stride;
      varying mediump vec3 tint;
      varying mediump vec2 tex;
      varying mediump float depth;
      varying mediump vec3 world;
      void main(){
        vec3 pose = point;
        if(pose.y < 26.0 && stride != 0.0) {
          pose.z += sign(pose.x) * stride * (1.0 - pose.y / 26.0);
        }
        vec3 position = vec3(pose.x * modelTurn.y + pose.z * modelTurn.x, pose.y, pose.z * modelTurn.y - pose.x * modelTurn.x) + modelOffset;
        vec3 p = position - eye;
        float x = p.x * heading.y + p.z * heading.x;
        float z = p.x * heading.x - p.z * heading.y;
        float y = p.y * tilt.y - z * tilt.x;
        z = p.y * tilt.x + z * tilt.y;
        gl_Position = vec4(x * scale.x, y * scale.y, z * 1.001 - 2.002, z);
        tint = color;
        tex = uv;
        depth = z;
        world = position;
      }`],
    [gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform sampler2D signs;
      uniform vec3 haze;
      uniform float fog;
      uniform float interiorLight;
      uniform float daylight;
      uniform float towerLights;
      uniform float opacity;
      varying vec3 tint;
      varying vec2 tex;
      varying float depth;
      varying vec3 world;
      void main(){
        vec3 base = tint;
        if(towerLights > .5) {
          float warm = smoothstep(0.0,.35,base.r-base.b);
          base = mix(vec3(1.0,.9,.67),vec3(1.0,.53,.19),warm);
          base *= .85 + .15 * smoothstep(.10,.85,tint.r);
        } else if(tex.x >= 0.0) {
          base *= texture2D(signs, tex).rgb;
        } else if(interiorLight > 0.5) {
          vec2 fixtureDistance = abs(mod(world.xz - vec2(118.0,83.0) + vec2(66.0,49.0), vec2(132.0,98.0)) - vec2(66.0,49.0));
          float pool = exp(-dot(fixtureDistance * vec2(0.020,0.035), fixtureDistance * vec2(0.020,0.035)));
          float tileSheen = (1.0 - smoothstep(1.0,8.0,world.y)) * pool;
          base = base * (0.89 + pool * 0.15) + vec3(0.10,0.12,0.13) * tileSheen;
        } else if(daylight > 0.5) {
          float sun = 0.92 + 0.08 * smoothstep(250.0, 490.0, world.x);
          base = clamp(base * sun * 1.22 + vec3(.13,.14,.155),0.0,1.0);
        } else if(world.y < 3.0) {
          float storefront = 1.0 - smoothstep(10.0,118.0,distance(world.xz,vec2(320.0,303.0)));
          base += vec3(.19,.17,.11) * storefront;
        }
        float distanceFog = clamp(depth * fog * (towerLights>.5?.34:1.0), 0.0, 0.43);
        gl_FragColor = vec4(mix(base, haze, distanceFog), opacity);
      }`]
  ];
  for (const [type, source] of shaders) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  const uniforms = Object.fromEntries(['eye','heading','tilt','scale','haze','fog','interiorLight','daylight','towerLights','opacity','modelOffset','modelTurn','stride'].map(name => [name, gl.getUniformLocation(program, name)]));
  const attributes = ['point','color','uv'].map(name => gl.getAttribLocation(program,name));

  const atlas = document.createElement('canvas');
  atlas.width = 512;
  atlas.height = 512;
  const ink = atlas.getContext('2d');
  const signs = new Map();
  function sign(id, text, bg, fg, width = 128, height = 32){
    const slot = signs.size;
    const x = (slot % 2) * 256;
    const y = Math.floor(slot / 2) * 56;
    ink.fillStyle=bg;
    ink.fillRect(x,y,width,height);
    ink.fillStyle=fg;
    ink.font = 'bold ' + Math.round(height * (id==='brand'?.8:.55)) + 'px system-ui, sans-serif';
    ink.textAlign='center';
    ink.textBaseline='middle';
    ink.fillText(text, x + width / 2, y + height / 2, width - 12);
    signs.set(id, [
      [(x+.5)/512,(y+height-.5)/512],[(x+width-.5)/512,(y+height-.5)/512],
      [(x+width-.5)/512,(y+.5)/512],[(x+.5)/512,(y+.5)/512]
    ]);
  }
  sign('brand','FamilyMart','#eef6ef','#17577c',256,52);
  sign('hours','24 HOURS','#174a50','#a0f8ca',128);
  sign('open','営業中 · OPEN','#0e4252','#8ff5ce',128);
  sign('entry','入口 · ENTRANCE','#227d69','#ecfff2',128);
  sign('exit','出口 · EXIT','#187558','#f0fff6',128);
  sign('minh','MINH','#edf4ec','#203f38',128);
  sign('maya','MAYA','#edf4ec','#203f38',128);
  sign('hana','HANA','#edf4ec','#203f38',128);
  sign('ana','ANA','#edf4ec','#203f38',128);
  const signColors = {drinks:'#245373',dessert:'#764859',meals:'#2a6d59',hot:'#9b5936',register:'#2c5369',microwave:'#384551'};
  for(const station of stations)sign(station.id, station.label, signColors[station.id], '#fff7e8');
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);

  let mesh = [];
  const untextured = [[-1,0],[-1,0],[-1,0],[-1,0]];
  function quad(a,b,c,d,hex,light=1,id){
    const n = Number.parseInt(hex.slice(1),16);
    const rgb=[n >> 16, (n >> 8) & 255, n & 255].map(k=>k*light/255);
    const vertices=[a,b,c,d];
    const uv=signs.get(id)||untextured;
    for(const index of [0,1,2,0,2,3])mesh.push(...vertices[index],...rgb,...uv[index]);
  }
  function front(x,y,z,w,h,id){
    quad([x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z],'#ffffff',1,id);
  }
  function back(x,y,z,w,h,id){
    quad([x+w,y,z],[x,y,z],[x,y+h,z],[x+w,y+h,z],'#ffffff',1,id);
  }
  function flat(x,z,w,d,y,color){
    quad([x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d],color);
  }
  function box(x,z,w,d,y,h,c){
    const a=[x,y,z],b=[x+w,y,z],d0=[x,y,z+d],c0=[x+w,y,z+d];
    const a1=[x,y+h,z],b1=[x+w,y+h,z],d1=[x,y+h,z+d],c1=[x+w,y+h,z+d];
    quad(d0,c0,c1,d1,c,.96);
    quad(b,a,a1,b1,c,.79);
    quad(a,d0,d1,a1,c,.79);
    quad(c0,b,b1,c1,c,.87);
    quad(a1,b1,c1,d1,c,1);
    quad(d0,c0,b,a,c,.68);
  }
  function rounded(x,y,z,rx,ry,rz,color,detail=12){
    const latitude=8;
    function point(row,column){
      const phi=Math.PI*(row/latitude-.5);
      const theta=2*Math.PI*column/detail;
      return [x+rx*Math.cos(phi)*Math.cos(theta),y+ry*Math.sin(phi),z+rz*Math.cos(phi)*Math.sin(theta)];
    }
    for(let j=0;j<latitude;j++){
      for(let k=0;k<detail;k++){
        const theta=2*Math.PI*(k+.5)/detail;
        const phi=Math.PI*((j+.5)/latitude-.5);
        const light=.78+.22*Math.max(0,Math.cos(phi)*Math.sin(theta)*.5+Math.sin(phi)*.85);
        quad(point(j,k),point(j,k+1),point(j+1,k+1),point(j+1,k),color,light);
      }
    }
  }
  function packagedProduct(x,z,y,id){
    const [, , ,type,color]=products[id];
    if(type==='bottle'||type==='cup'){
      rounded(x+4,y+6,z+4,3.5,6,3.2,color,8);
      box(x+2,z+2.5,4,3,y+11,2,'#f1efdf');
      box(x+1.6,z+6.4,4.8,.45,y+3.5,4,'#ece8cd');
    }else if(type==='rice'){
      quad([x,y,z+8],[x+10,y,z+8],[x+7,y+8,z+8],[x+3,y+8,z+8],'#f7efe2');
      quad([x+3,y+8,z+8],[x+7,y+8,z+8],[x+7,y+8,z+1],[x+3,y+8,z+1],'#faf7ee');
      quad([x,y,z+8],[x+3,y+8,z+8],[x+3,y+8,z+1],[x,y,z+1],'#d9e1d2');
      quad([x+7,y+8,z+8],[x+10,y,z+8],[x+10,y,z+1],[x+7,y+8,z+1],'#ebe9da');
      box(x+2,z+7.8,6,.5,y+.1,3,color);
    }else if(type==='bento'){
      box(x,z,11,11,y,2.8,'#353e40');
      box(x+.7,z+.7,9.6,9.6,y+2.8,1.3,color);
      box(x+1,z+5,9,.9,y+4.1,.4,'#fff4d6');
    }else{
      rounded(x+5,y+2.2,z+4,4,2.6,3.5,color,8);
      box(x,z,10,8,y,.8,'#eee1c4');
    }
  }
  function fixture(s){
    const {x,y,w,h,id,ids}=s;
    if(id==='microwave'){
      box(x,y,w,h,0,27,'#929d9d');
      box(x-1,y-1,w+2,h+2,27,3,'#d9d9cb');
      box(x+17,y+2,53,h-5,30,28,'#d6dcdb');
      box(x+20,y+1.4,34,.7,34,18,'#26333b');
      box(x+22,y+1.15,30,.7,42,1.2,'#4c6068');
      box(x+55,y+.7,2,1.8,34,18,'#aab6ba');
      box(x+60,y+1.1,8,.7,46,4,'#30463e');
      for(let j=0;j<3;j++)box(x+61+j*2.5,y+.8,1.3,.7,39,1.4,'#636e73');
      back(x+8,13,y-.2,w-16,9,id);
      front(x+8,13,y+h+.2,w-16,9,id);
      return;
    }
    if(id==='register'){
      box(x,y,w,h,0,43,'#527188');
      box(x-2,y-2,w+4,h+4,43,5,'#c8d7cc');
      box(x+63,y+12,24,14,48,15,'#263a46');
      box(x+66,y+26.3,18,1,52,8,'#78cab5');
      box(x+17,y+30,23,16,48,2,'#384950');
      box(x+24,y+37,11,3,50,1,'#e66352');
      front(x+12,25,y+h+.3,w-24,14,id);
      return;
    }
    const cold=id==='drinks', hot=id==='hot';
    const tall=cold?114:hot?68:55;
    box(x,y,w,h,0,6,cold?'#50778a':'#4c6067');
    box(x,y,3,h,6,tall-6,cold?'#86afb9':hot?'#efb66e':'#aeb9b2');
    box(x+w-3,y,3,h,6,tall-6,cold?'#86afb9':hot?'#efb66e':'#aeb9b2');
    box(x+3,y+(cold?3:h/2-2),w-6,cold?4:4,6,tall-6,cold?'#a8c9cb':hot?'#b86d43':'#889d98');
    const levels=cold?[12,34,56,78]:hot?[12,35]:[10,31];
    for(const bottom of levels){
      box(x+3,y,w-6,h,bottom,3,hot?'#da985d':'#c4cdc3');
      for(let i=0;i<Math.floor((w-10)/14);i++){
        const propX=x+7+i*14;
        const propZ=y+h-17;
        packagedProduct(propX,propZ,bottom+3,ids[i%ids.length]);
        if(s.side==='both')packagedProduct(propX,y+7,bottom+3,ids[(i+1)%ids.length]);
      }
    }
    box(x,y,w,h,tall-5,5,hot?'#fcd084':cold?'#608fa4':'#b0c2b5');
    if(cold)for(let i=x+45;i<x+w;i+=45)box(i,y+h-2,2,2,6,tall-11,'#719ca9');
    front(x+3,tall-5,y+h+.2,w-6,13,id);
    if(s.side==='both')back(x+3,tall-5,y-.2,w-6,13,id);
  }
  function person({shirt='#327f77',skin='#e4b091',pants='#354653',hair='#292832',badge,accessory}={}){
    const x=0,z=0;
    box(x-9,z-4,7,9,1,23,pants);
    box(x+2,z-4,7,9,1,23,pants);
    rounded(x,42,z,12,17,7,shirt);
    rounded(x-12,42,z+1,4.3,12,4.5,shirt);
    rounded(x+12,42,z+1,4.3,12,4.5,shirt);
    rounded(x-13,31,z+4,3,4,3.5,skin);
    rounded(x+13,31,z+4,3,4,3.5,skin);
    rounded(x,57,z,3.4,6,3.8,skin);
    rounded(x,66,z,7.1,9,6.7,skin);
    rounded(x,72,z-1,7.5,4.4,6.9,hair);
    if(badge||accessory==='cap'){
      rounded(x,74,z-.5,7.6,2.8,6.8,badge?'#3d9387':shirt);
      rounded(x,72.3,z+4,7.6,1,5,badge?'#5caa98':shirt);
    }
    if(accessory==='longHair')rounded(x,65,z-4,7,10,4,hair);
    if(accessory==='backpack')rounded(x,42,z-7,9,12,5,'#5a564b');
    if(accessory==='scarf')rounded(x,54,z+1,7,2.7,5,'#e4ba72');
    rounded(x-2.7,66.8,z+5.7,.72,.7,.65,'#3c383c',8);
    rounded(x+2.7,66.8,z+5.7,.72,.7,.65,'#3c383c',8);
    rounded(x,64.3,z+6.2,1.15,1.2,1.2,skin,8);
    box(x-1.5,z+5.9,3,.5,61.4,.43,'#9e675f');
    if(badge)front(x+3,48,z+6.8,6,2.4,badge);
  }
  function interior(){
    for(let z=30;z<450;z+=24)for(let x=20;x<622;x+=24){
      flat(x,z,24,24,0,'#b8b5a8');
      const floor=['#dedacf','#d9d6cb','#dad8cf','#d8d7ce'];
      flat(x+.25,z+.25,23.5,23.5,.12,floor[((x-20)/24+3*(z-30)/24)%floor.length]);
    }
    flat(18,28,606,422,126,'#e3e3d9');
    for(let x=48;x<620;x+=34)box(x,31,.4,410,125.65,.15,'#b7bbb2');
    for(let z=50;z<440;z+=33)box(26,z,587,.4,125.65,.15,'#b7bbb2');
    box(18,27,606,9,0,126,'#bccbc4');
    box(18,30,9,418,0,126,'#b7c9c5');
    box(613,30,9,418,0,126,'#b7c9c5');
    box(18,440,260,9,0,126,'#9cb5b2');
    box(362,440,260,9,0,126,'#9cb5b2');
    for(const [z,color] of [[104,'#52a77b'],[98,'#4285ad']]){
      box(27,36,586,1,z,3,color);
      box(27,36,1,403,z,3,color);
      box(612,36,1,403,z,3,color);
    }
    box(278,439,84,4,92,34,'#acc7c1');
    back(294,98,438.6,52,13,'exit');
    for(const x of [277,361])box(x,441,2,8,0,92,'#738b8e');
    flat(278,449,84,90,.2,'#485869');
    box(236,530,170,5,0,120,'#2d4055');
    box(241,528.5,157,2,37,7,'#778478');
    box(291,418,58,19,0,1,'#567e79');
    for(let z=76;z<=392;z+=98)for(let x=83;x<=550;x+=132){
      box(x,z,71,15,121,3,'#a5bdb9');
      box(x+2,z+1,67,13,120,1,'#f5ffde');
    }
    for(const s of stations)fixture(s);
    box(402,43,180,46,0,43,'#71888c');
    box(402,43,180,10,43,47,'#95aaa7');
    for(let i=0;i<13;i++){
      box(410+i*12,61,8,12,43,16,products[i%products.length][4]);
      box(411+i*12,73,6,1,48,5,'#f0e8ce');
    }
    box(36,386,78,39,0,27,'#657f86');
  }
  function tower(){
    const x=767,z=-343;
    const stretch=1.29;
    const start=mesh.length;
    const red='#ef7848',white='#f4d5ad';
    const levels=[[0,95],[75,81],[145,60],[200,43],[246,27],[290,22],[331,16],[356,11]];
    function beam(a,b,width,color){
      const dx=b[0]-a[0],dz=b[2]-a[2];
      const length=Math.hypot(dx,dz)||1;
      const u=dz/length*width,v=dx/length*width;
      quad([a[0]-u,a[1],a[2]+v],[a[0]+u,a[1],a[2]-v],[b[0]+u,b[1],b[2]-v],[b[0]-u,b[1],b[2]+v],color);
      const u2=v||width, v2=u||width;
      quad([a[0]-u2,a[1],a[2]-v2],[a[0]+u2,a[1],a[2]+v2],[b[0]+u2,b[1],b[2]+v2],[b[0]-u2,b[1],b[2]-v2],color,.82);
    }
    function corners([height,radius]){
      return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([i,j])=>[x+i*radius,height,z+j*radius]);
    }
    for(let i=0;i<levels.length-1;i++){
      const from=corners(levels[i]), to=corners(levels[i+1]);
      const color=i%2?white:red;
      for(let side=0;side<4;side++){
        const next=(side+1)%4;
        beam(from[side],to[side],3.8,color);
        beam(from[side],to[next],1.65,color);
        beam(from[next],to[side],1.65,color);
        beam(to[side],to[next],2.15,color);
      }
    }
    for(const [height,width] of [[196,98],[306,46]]){
      box(x-width/2,z-width/2,width,width,height,16,'#a16951');
      box(x-width/2-2,z-width/2-2,width+4,width+4,height+15,4,'#f4ad71');
      for(let i=5;i<width-3;i+=9)box(x-width/2+i,z+width/2-.4,5,1.5,height+4,8,'#ffe1a3');
    }
    for(let i=0;i<7;i++){
      const w=10-i*.9;
      box(x-w/2,z-w/2,w,w,354+i*10,10,i%2?white:red);
    }
    box(x-1.25,z-1.25,2.5,2.5,424,13,'#fcdac1');
    rounded(x,437,z,3,2.4,3,'#ffb88b',8);
    for(let index=start+1;index<mesh.length;index+=8)mesh[index]*=stretch;
  }
  function exterior(){
    flat(-1500,-1100,3500,2480,0,'#243145');
    flat(-1050,285,2450,89,.08,'#627478');
    for(let z=298;z<374;z+=19)for(let x=-1044;x<1400;x+=24)flat(x+.6,z+.7,23,18,.2,'#566772');
    box(-1050,373,2450,5,0,3,'#859598');
    flat(-1050,507,2450,65,.1,'#566772');
    box(-1050,502,2450,5,0,3,'#859598');
    for(let x=-1010;x<1300;x+=91)flat(x,437,48,2,.1,'#a5a393');
    for(const z of [387,492])flat(-1050,z,2450,1.2,.12,'#7c8790');
    for(let z=382;z<504;z+=13)flat(496,z,51,6,.22,'#c5c7bc');
    box(490,372,4,4,0,83,'#657982');
    box(507,508,4,4,0,83,'#657982');
    box(485,370,13,8,66,16,'#293a43');
    box(502,506,13,8,66,16,'#293a43');
    for(let i=0;i<14;i++){
      const x=i*88-280;
      const height=65+(i*93)%108, z=87-(i%4)*63;
      box(x,z,74,53,0,height,i%2?'#233349':'#2a384b');
      box(x+7,z+15,49,27,height,9,'#26384b');
      for(let row=17;row<height-10;row+=15){
        for(let col=0;col<6;col++){
          const lit=(i*31+row*7+col*19)%11;
          if(lit<=5)box(x+6+col*11,z+52.8,5.7,1,row,7,lit<2?'#d8bd89':'#596e82');
        }
      }
    }
    for(let i=0;i<15;i++){
      const x=-660+i*115,width=81+i%3*8;
      const depth=61+i%4*19;
      const height=75+i*29%90;
      const z=553+i%3*17;
      box(x,z,width,depth,0,height,i%2?'#303b4a':'#384454');
      box(x+2,z-1,width-4,1,0,12,'#4f5a63');
      for(let row=21;row<height-6;row+=19)for(let col=9;col<width-10;col+=17){
        box(x+col,z-.2,8,1,row,10,(i+row+col)%4===0?'#d2ae75':'#617489');
      }
      if(i%2===0)box(x+8,z+14,width-28,34,height,11,'#2c3b4b');
    }
    for(const x of [-262,-116,696,851,1011]){
      box(x,168,105,108,0,67+(x>600?43:0),'#434d58');
      box(x-1,167,107,111,66+(x>600?43:0),6,'#525f6b');
      for(let i=0;i<5;i++)box(x+10+i*17,275.5,8,1.2,37,15,i%2?'#526477':'#b4a181');
    }
    for(const x of [-270,-80,650,835,1010]){
      box(x,343,3,4,0,84,'#526171');
      box(x-4,343,22,4,82,4,'#657181');
      box(x+10,344,8,10,79,4,'#f5dba6');
    }
    box(78,143,485,151,103,23,'#354e61');
    box(77,142,487,153,126,5,'#485f73');
    for(const x of [78,553]){
      box(x,144,10,148,0,103,'#aab8b2');
      box(x-.3,144,10.6,148,70,6,'#4f98bf');
      box(x-.3,144,10.6,148,97,5,'#68bf8a');
      box(x-.3,144,10.6,148,0,9,'#667a80');
      for(let z=153;z<287;z+=31)box(x-.4,z,10.8,.6,10,58,'#809489');
    }
    box(86,144,468,8,0,103,'#9caea7');
    box(84,270,472,25,73,29,'#eef6ef');
    front(207,75,295.2,226,25,'brand');
    box(83,275,474,21,99,5,'#66d293');
    box(83,275,474,21,72,5,'#4b9bd6');
    box(83,275,474,23,64,8,'#2c435a');
    for(const x of [85,263,371,550])box(x,270,7,24,0,64,'#b1c9bd');
    for(const [x,w] of [[92,171],[378,172]]){
      box(x,212,w,5,0,64,'#a9b8a0');
      box(x,258,w,7,0,11,'#94a096');
      box(x,271,w,8,0,8,'#6e9590');
      for(let level=13;level<=50;level+=18){
        box(x+2,241,w-4,15,level,3,'#73877d');
        for(let i=0;i<12;i++)packagedProduct(x+5+i*13,243,level+3,i%products.length);
      }
      for(let bx=x+41;bx<x+w;bx+=42)box(bx,274,3,2,7,57,'#9ac6bc');
      box(x,274,w,2,48,2,'#d6eade');
    }
    box(267,274,105,6,63,4,'#aacabf');
    box(271,250,98,4,0,65,'#b7dac4');
    flat(271,253,98,46,.3,'#abbea1');
    flat(280,299,80,39,.27,'#838e78');
    box(270,287,4,5,0,63,'#455f6d');
    box(366,287,4,5,0,63,'#455f6d');
    front(298,67,298.2,44,8,'entry');
    front(416,49,278,45,12,'open');
    front(113,14,278,43,11,'hours');
    for(const x of [66,572]){
      box(x,291,13,13,0,12,'#51636c');
      box(x+3,294,7,6,12,13,'#387661');
      box(x,291,13,12,17,8,'#428772');
    }
    box(595,275,4,5,0,84,'#3e5262');
    box(586,269,20,16,83,3,'#ead697');
  }
  function pedestrianSignal(green){
    for(const [x,z] of [[485,370],[502,506]]){
      for(const face of [z-.35,z+8.25]){
        const color=green?'#54f3a6':'#f47363';
        const y=green?69:75;
        box(x+5,face,3,.12,y+4,2,color);
        box(x+4,face,5,.12,y+1,2,color);
        box(x+3,face,2,.12,y-1,2,color);
        box(x+8,face,2,.12,y-1,2,color);
      }
    }
  }
  function sleepingPerson(){
    rounded(0,5,-4,9,5,14,'#785857');
    rounded(-5,3,-22,4,3,11,'#485063');
    rounded(5,3,-19,4,3,10,'#485063');
    rounded(-5,2.2,-32,4,2,5,'#2b3743');
    rounded(7,2.2,-29,4,2,5,'#2b3743');
    rounded(0,5,13,6,4,7,'#d0a082');
    rounded(0,5,15,6.3,4.1,5.2,'#302d34');
    rounded(-9,3,4,3,2,10,'#785857');
    rounded(7,4,6,3,2,8,'#785857');
    rounded(8,3,12,3,2,4,'#d0a082');
    box(-11,9,20,11,.1,1.5,'#4d5757');
    box(13,-1,3,8,.15,2.5,'#789384');
  }
  function stars(){
    for(let i=0;i<95;i++){
      const x=(i*223)%1690-470, y=148+(i*139)%440;
      const size=i%9===0?1.9:.75;
      quad([x,y,-620],[x+size,y,-620],[x+size,y+size,-620],[x,y+size,-620],i%7?'#697d97':'#d1d1cc');
    }
  }
  function clouds(){
    for(const [x,y,w] of [[-85,330,148],[102,464,245],[659,384,171],[953,510,219]]){
      for(let i=0;i<5;i++){
        rounded(x+i*w*.21,y+Math.sin(i)*10,-709-i*5,w*.23,7+Math.sin(i+1)*5,1,'#e7f0f4',10);
      }
    }
  }
  function doors(open){
    for(const x of [274-(open?38:0),321+(open?38:0)]){
      box(x,281,45,2,0,62,'#638b88');
      box(x+2,282.8,41,.5,3,55,'#98b6a5');
      box(x+2,283.4,41,.6,44,2,'#d1dace');
      box(x+2,283.4,41,.6,26,2,'#d8daba');
    }
  }
  function build(draw){
    mesh=[];
    draw();
    const buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh),gl.STATIC_DRAW);
    return {buffer,count:mesh.length/8};
  }
  const street=build(exterior);
  const towerMesh=build(tower);
  const sleeperMesh=build(sleepingPerson);
  const nightSky=build(stars);
  const daySky=build(clouds);
  const store=build(interior);
  const clerks=[
    {badge:'minh'},
    {badge:'maya',skin:'#b78264',hair:'#3f2e31',accessory:'longHair'},
    {badge:'hana',skin:'#cb987c',hair:'#2b2630',accessory:'longHair'},
    {badge:'ana',skin:'#d7a58b',hair:'#534038'}
  ].map(profile=>build(()=>person(profile)));
  const pedestrianSignals=[build(()=>pedestrianSignal(false)),build(()=>pedestrianSignal(true))];
  const people=[
    {shirt:'#b8735d',pants:'#333448',accessory:'longHair'},
    {shirt:'#557c9b',pants:'#62584b',skin:'#b87f63',accessory:'cap'},
    {shirt:'#816884',pants:'#52616f',accessory:'backpack',hair:'#563b32'},
    {shirt:'#769373',pants:'#454957',skin:'#cc9776',accessory:'scarf'},
    {shirt:'#b7a180',pants:'#44494d',accessory:'cap',hair:'#534531'},
    {shirt:'#5d738c',pants:'#7c6556',skin:'#c69476',accessory:'longHair'},
    {shirt:'#9b6472',pants:'#2c3848',accessory:'scarf',hair:'#432d28'},
    {shirt:'#b59b50',pants:'#57555e',skin:'#a76e51',accessory:'backpack'},
    {shirt:'#557e77',pants:'#646775',skin:'#f0b893',accessory:'longHair',hair:'#51403b'}
  ].map(appearance=>build(()=>person(appearance)));
  const closed=build(()=>doors(false));
  const opened=build(()=>doors(true));
  const glass=build(()=>{
    for(const [x,w] of [[92,171],[378,172]]){
      quad([x,8,276.2],[x+w,8,276.2],[x+w,64,276.2],[x,64,276.2],'#8eb7bf');
      quad([x+5,8,276.4],[x+13,8,276.4],[x+41,64,276.4],[x+33,64,276.4],'#bed6de');
    }
  });
  const ovenGlow=build(()=>{
    box(514,388.05,26,.3,37,12,'#dc9751');
    box(551,387.8,7,.2,46,3,'#8df4a2');
  });
  function draw({buffer,count}){
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    attributes.forEach((location,index)=>{
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location,index===2?2:3,gl.FLOAT,false,32,[0,12,24][index]);
    });
    gl.drawArrays(gl.TRIANGLES,0,count);
  }
  function drawPerson(model,actor){
    const swing=Math.sin(actor.step);
    gl.uniform3f(uniforms.modelOffset,actor.x,Math.abs(swing)*1.3,actor.y);
    gl.uniform2f(uniforms.modelTurn,Math.sin(actor.angle),Math.cos(actor.angle));
    gl.uniform1f(uniforms.stride,swing*6);
    draw(model);
  }
  return function render(player,inside,started,heating,timeOfDay,finished,staff,guests,sleeper,time,walkSignal){
    const width=Math.round(canvas.clientWidth);
    const height=Math.round(canvas.clientHeight);
    if(!width||!height)return;
    const resolution=Math.min(window.devicePixelRatio||1,1350/width,960/height);
    const targetWidth=Math.round(width*resolution), targetHeight=Math.round(height*resolution);
    if(canvas.width!==targetWidth||canvas.height!==targetHeight){
      canvas.width=targetWidth;
      canvas.height=targetHeight;
      gl.viewport(0,0,targetWidth,targetHeight);
    }
    const day=timeOfDay==='day';
    const haze=inside?[.73,.81,.76]:day?[.48,.70,.86]:[.07,.12,.21];
    gl.clearColor(...haze,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const angle=started?player.angle:-.095;
    const pitch=started?player.pitch:.085;
    const eye=started?[player.x,63+Math.sin(player.step)*.8,player.y]:[495,68,557];
    gl.uniform3f(uniforms.eye,...eye);
    gl.uniform2f(uniforms.heading,Math.sin(angle),Math.cos(angle));
    gl.uniform2f(uniforms.tilt,Math.sin(pitch),Math.cos(pitch));
    gl.uniform2f(uniforms.scale,1.47/Math.max(1,targetWidth/targetHeight),1.47*Math.min(1,targetWidth/targetHeight));
    gl.uniform3f(uniforms.haze,...haze);
    gl.uniform1f(uniforms.fog,inside?.00044:.00032);
    gl.uniform1f(uniforms.interiorLight,Number(inside));
    gl.uniform1f(uniforms.daylight,Number(day));
    gl.uniform1f(uniforms.towerLights,0);
    gl.uniform1f(uniforms.opacity,1);
    gl.uniform3f(uniforms.modelOffset,0,0,0);
    gl.uniform2f(uniforms.modelTurn,0,1);
    gl.uniform1f(uniforms.stride,0);
    draw(inside?store:street);
    if(inside&&heating)draw(ovenGlow);
    if(!inside){
      draw(day?daySky:nightSky);
      gl.uniform1f(uniforms.towerLights,Number(!day));
      draw(towerMesh);
      gl.uniform1f(uniforms.towerLights,0);
      draw(pedestrianSignals[Number(walkSignal)]);
      draw(started&&!finished&&player.x>274&&player.x<367&&player.y<327?opened:closed);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.uniform1f(uniforms.opacity,.28);
      draw(glass);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.uniform1f(uniforms.opacity,1);
      if(!day){
        gl.uniform3f(uniforms.modelOffset,sleeper.x,Math.sin(time/730)*.32,sleeper.y);
        gl.uniform2f(uniforms.modelTurn,Math.sin(sleeper.angle),Math.cos(sleeper.angle));
        draw(sleeperMesh);
      }
    }
    if(inside&&staff)drawPerson(clerks[staff.profile],staff);
    guests.forEach(guest=>{if(guest.inside===inside)drawPerson(people[guest.appearance],guest);});
  };
};
