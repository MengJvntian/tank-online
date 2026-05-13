const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

const TICK = 1000 / 30;
const W = 672, H = 672, TILE = 32, ROWS = 21, COLS = 21;
const EMPTY=0, BRICK=1, STEEL=2, WATER=3, GRASS=4, BASE=5;

const SKINS = { green:"#22c55e", blue:"#38bdf8", gold:"#facc15", pink:"#fb7185", purple:"#a855f7", black:"#64748b" };

const LEVELS = [
 { name:"训练营", enemyTotal:16, reward:120, map:[
".....................","..B..B..B...B..B..B..","..B..B..B...B..B..B..",".....................",
"....SS.......SS......",".....................","..BB....BBB....BB....","..BB.....G.....BB....",
"..........W..........","..........W..........","....BB.........BB....","....BB.........BB....",
"..........G..........","..SS.............SS..",".....................","..B..B..B...B..B..B..",
"..B..B..B...B..B..B..",".........BBB.........",".........BEB.........","........BBBBB........","....................."]},
 { name:"河道防线", enemyTotal:22, reward:180, map:[
".....................",".BBB....SSSSS....BBB.",".B.................B.",".B..GG.........GG..B.",
"....GG.........GG....",".........WWW.........","BBBB.....WWW.....BBBB",".........WWW.........",
"....SS.........SS....",".....................","..BBBBB.....BBBBB....",".....................",
"....SS...GGG...SS....",".........GGG.........","BBBB.............BBBB","....WWW.......WWW....",
"....WWW.......WWW....",".........BBB.........",".........BEB.........","........BBBBB........","....................."]},
 { name:"钢铁迷宫", enemyTotal:28, reward:260, map:[
".....................","SSS..BBB.....BBB..SSS",".....B.........B.....",".BBB.B.SSSSSSS.B.BBB.",
".B...B.........B...B.",".B.SSS..WWW..SSS.B..",".B......WWW......B..",".BBBBB.......BBBBB..",
".......GGGGG........","SSS...............SSS",".....BBB.....BBB.....","SSS...............SSS",
".......GGGGG........",".BBBBB.......BBBBB..",".B......WWW......B..",".B.SSS..WWW..SSS.B..",
".B...B.........B...B.",".....B...BBB...B.....",".........BEB.........","........BBBBB........","....................."]},
 { name:"草丛伏击", enemyTotal:34, reward:340, map:[
".....................","..GGGGG.......GGGGG..","..GBBBG.......GBBBG..","..G...G..SSS..G...G..",
"..G...G.......G...G..","BBBB....GGGGG....BBBB","........G...G........","..SS....G...G....SS..",
"........GGGGG........","....WWW.......WWW....","....WWW.......WWW....","........GGGGG........",
"..SS....G...G....SS..","........G...G........","BBBB....GGGGG....BBBB","..G...G.......G...G..",
"..G...G..BBB..G...G..","........BBB..........",".........BEB.........","........BBBBB........","....................."]},
 { name:"十字火线", enemyTotal:40, reward:460, map:[
".....................","BBBBB.....S.....BBBBB","....B.....S.....B....","....B.....S.....B....",
"....B.....S.....B....","SSSSS.....S.....SSSSS",".....................","....BBB.......BBB....",
"....B...........B....","SSSSS....WWW....SSSSS",".........WWW.........","SSSSS....WWW....SSSSS",
"....B...........B....","....BBB.......BBB....",".....................","SSSSS.....S.....SSSSS",
"....B.....S.....B....","....B....BBB....B....",".........BEB.........","........BBBBB........","....................."]},
 { name:"终极堡垒", enemyTotal:52, reward:700, boss:true, map:[
".....................","SSS.BBB.WWW.BBB.SSS.","....B...W.W...B.....",".BB.B.S.W.W.S.B.BB..",
".B....S.W.W.S....B..",".B.SSSS.W.W.SSSS.B..","...S....W.W....S....","GGGG..BBBBBBB..GGGG.",
"G.....B.....B.....G.","G.SSS.B.WWW.B.SSS.G.","G.....B.WWW.B.....G.","G.SSS.B.WWW.B.SSS.G.",
"G.....B.....B.....G.","GGGG..BBBBBBB..GGGG.","...S....W.W....S....",".B.SSSS.W.W.SSSS.B..",
".B....S.....S....B..",".BB.B...BBB...B.BB..",".........BEB.........","........BBBBB........","....................."]}
];

const rooms = new Map();
let nextPlayerId = 1;

function roomCode(){ let s; do { s = Math.random().toString(36).slice(2,6).toUpperCase(); } while(rooms.has(s)); return s; }
function parseMap(level){ return LEVELS[level-1].map.map(row=>row.split("").map(ch=>{ if(ch==="B")return BRICK; if(ch==="S")return STEEL; if(ch==="W")return WATER; if(ch==="G")return GRASS; if(ch==="E")return BASE; return EMPTY; })); }
function makeRoom(code, level=1){ return { code, level, state:"lobby", map:parseMap(level), players:new Map(), bullets:[], enemies:[], powerUps:[], effects:[], enemyRemain:LEVELS[level-1].enemyTotal, spawnTimer:0, tick:0, score:0, coins:0, message:"等待玩家准备", baseAlive:true }; }
function publicRoom(room){ return { code:room.code, level:room.level, state:room.state, players:[...room.players.values()].map(p=>({id:p.id,nick:p.nick,skin:p.skin,ready:p.ready,life:p.life,score:p.score,coins:p.coins})), maxPlayers:4 }; }
function send(ws,obj){ if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(obj)); }
function broadcast(room,obj){ for(const p of room.players.values()) send(p.ws,obj); }
function rect(a,b){ return a.x<b.x+b.size && a.x+a.size>b.x && a.y<b.y+b.size && a.y+a.size>b.y; }
function blocked(room,x,y,size, ghost=false){
  if(x<0||y<0||x+size>W||y+size>H)return true;
  const l=Math.floor(x/TILE), r=Math.floor((x+size-1)/TILE), t=Math.floor(y/TILE), b=Math.floor((y+size-1)/TILE);
  for(let row=t;row<=b;row++)for(let col=l;col<=r;col++){
    const tile=room.map[row]?.[col]??STEEL;
    if(ghost && [BRICK,STEEL,WATER].includes(tile)) continue;
    if([BRICK,STEEL,WATER,BASE].includes(tile)) return true;
  }
  return false;
}
function spawnPos(i){ return [{x:9*TILE+1,y:20*TILE+1},{x:11*TILE+1,y:20*TILE+1},{x:8*TILE+1,y:19*TILE+1},{x:12*TILE+1,y:19*TILE+1}][i%4]; }
function newPlayer(ws, nick, skin, idx){
  const pos=spawnPos(idx);
  return { id:"P"+nextPlayerId++, ws, nick:(nick||"玩家").slice(0,10), skin:SKINS[skin]?skin:"green", x:pos.x,y:pos.y,size:30,dir:"up", input:{}, ready:false, life:3, score:0, coins:0, cooldown:0, buffs:{speed:0,double:0,shield:0,freeze:0,laser:0,ghost:0,magnet:0}, alive:true };
}
function createEnemy(room, kind){
  const spots=[{x:0,y:0},{x:5*TILE,y:0},{x:10*TILE,y:0},{x:15*TILE,y:0},{x:20*TILE-30,y:0}];
  const sp=spots[Math.floor(Math.random()*spots.length)];
  if(blocked(room,sp.x,sp.y,30,false)) return false;
  const stat = { normal:{hp:1,speed:1.2,color:"#ef4444",score:100}, fast:{hp:1,speed:2.0,color:"#f97316",score:150}, heavy:{hp:3,speed:.9,color:"#a855f7",score:250}, sniper:{hp:1,speed:1.0,color:"#06b6d4",score:220}, boss:{hp:12,speed:.7,color:"#be123c",score:1200} }[kind];
  room.enemies.push({id:"E"+Math.random().toString(36).slice(2,8),x:sp.x,y:sp.y,size:30,dir:"down",kind,hp:stat.hp,maxHp:stat.hp,speed:stat.speed,color:stat.color,score:stat.score,cooldown:60,moveTimer:20});
  return true;
}
function shoot(room, owner, tank){
  if(tank.cooldown>0) return;
  const laser = owner==="player" && tank.buffs.laser>0;
  const double = owner==="player" && tank.buffs.double>0;
  const sides = double?[-1,1]:[0];
  for(const side of sides){
    let x=tank.x+tank.size/2-4, y=tank.y+tank.size/2-4, s=side*7;
    if(tank.dir==="up"){y-=13;x+=s} if(tank.dir==="down"){y+=13;x+=s} if(tank.dir==="left"){x-=13;y+=s} if(tank.dir==="right"){x+=13;y+=s}
    room.bullets.push({id:"B"+Math.random().toString(36).slice(2,8), x,y,size:laser?10:8,dir:tank.dir,speed:owner==="player"?(laser?9:6.5):4.7,owner,ownerId:tank.id,laser});
  }
  tank.cooldown = owner==="player"? (laser?12:18) : (tank.kind==="sniper"?45:75);
}
function addEffect(room,type,x,y,text=""){ room.effects.push({type,x,y,text,life:35}); }
function power(room,x,y){
  const types=["life","speed","double","shield","bomb","freeze","repair","laser","coin","wall","ghost","magnet"];
  room.powerUps.push({id:"U"+Math.random().toString(36).slice(2,8),x,y,size:26,type:types[Math.floor(Math.random()*types.length)],life:600});
}
function repairBase(room, steel=false){ [[18,9],[18,10],[18,11],[19,8],[19,9],[19,10],[19,11],[19,12]].forEach(([r,c])=>{ if(room.map[r]) room.map[r][c]=steel?STEEL:BRICK; }); }
function startRoom(room, level=room.level){
  room.level=level; room.state="playing"; room.map=parseMap(level); room.bullets=[]; room.enemies=[]; room.powerUps=[]; room.effects=[]; room.enemyRemain=LEVELS[level-1].enemyTotal; room.spawnTimer=0; room.tick=0; room.score=0; room.coins=0; room.baseAlive=true; room.message="战斗开始";
  let i=0; for(const p of room.players.values()){ const pos=spawnPos(i++); Object.assign(p,{x:pos.x,y:pos.y,dir:"up",life:3,score:0,coins:0,cooldown:0,alive:true,ready:false}); p.buffs={speed:0,double:0,shield:0,freeze:0,laser:0,ghost:0,magnet:0}; }
  broadcast(room,{type:"start", room:publicRoom(room)});
}

wss.on("connection", ws=>{
  let myRoom=null, me=null;
  send(ws,{type:"hello"});
  ws.on("message", raw=>{
    let msg; try{ msg=JSON.parse(raw); }catch{return;}
    if(msg.type==="create"){
      const code=roomCode(); const room=makeRoom(code, Number(msg.level)||1); rooms.set(code,room);
      me=newPlayer(ws,msg.nick,msg.skin,0); room.players.set(me.id,me); myRoom=room;
      send(ws,{type:"joined", selfId:me.id, room:publicRoom(room), levels:LEVELS.map((l,i)=>({i:i+1,name:l.name,reward:l.reward,enemyTotal:l.enemyTotal}))});
      broadcast(room,{type:"room", room:publicRoom(room)});
    }
    if(msg.type==="join"){
      const code=String(msg.code||"").toUpperCase().trim(); const room=rooms.get(code);
      if(!room) return send(ws,{type:"error", message:"房间不存在"});
      if(room.players.size>=4) return send(ws,{type:"error", message:"房间已满"});
      me=newPlayer(ws,msg.nick,msg.skin,room.players.size); room.players.set(me.id,me); myRoom=room;
      send(ws,{type:"joined", selfId:me.id, room:publicRoom(room), levels:LEVELS.map((l,i)=>({i:i+1,name:l.name,reward:l.reward,enemyTotal:l.enemyTotal}))});
      broadcast(room,{type:"room", room:publicRoom(room)});
    }
    if(!myRoom||!me) return;
    if(msg.type==="input") me.input=msg.input||{};
    if(msg.type==="ready"){ me.ready=!!msg.ready; broadcast(myRoom,{type:"room", room:publicRoom(myRoom)}); }
    if(msg.type==="start"){ const lvl=Math.max(1,Math.min(LEVELS.length,Number(msg.level)||myRoom.level)); startRoom(myRoom,lvl); }
    if(msg.type==="skin"){ if(SKINS[msg.skin]) me.skin=msg.skin; broadcast(myRoom,{type:"room", room:publicRoom(myRoom)}); }
    if(msg.type==="chat"){ broadcast(myRoom,{type:"chat", nick:me.nick, text:String(msg.text||"").slice(0,60)}); }
  });
  ws.on("close",()=>{ if(myRoom&&me){ myRoom.players.delete(me.id); broadcast(myRoom,{type:"room", room:publicRoom(myRoom)}); if(myRoom.players.size===0) rooms.delete(myRoom.code); } });
});

function step(){
 for(const room of rooms.values()){
  if(room.state!=="playing") continue;
  room.tick++;
  const freeze = [...room.players.values()].some(p=>p.buffs.freeze>0);
  for(const p of room.players.values()){
    if(!p.alive) continue;
    let sp=2.55+(p.buffs.speed>0?1.05:0), dx=0, dy=0;
    if(p.input.up){dy=-sp;p.dir="up"} else if(p.input.down){dy=sp;p.dir="down"} else if(p.input.left){dx=-sp;p.dir="left"} else if(p.input.right){dx=sp;p.dir="right"}
    if(dx||dy){ if(!blocked(room,p.x+dx,p.y+dy,p.size,p.buffs.ghost>0)){p.x+=dx;p.y+=dy;} }
    if(p.cooldown>0)p.cooldown--;
    for(const k of Object.keys(p.buffs)) if(p.buffs[k]>0)p.buffs[k]--;
    if(p.input.shoot) shoot(room,"player",p);
  }
  room.spawnTimer++;
  if(room.spawnTimer > Math.max(35, 95-room.level*7) && room.enemyRemain>0){
    let kind="normal", roll=Math.random();
    if(LEVELS[room.level-1].boss && room.enemyRemain===1) kind="boss";
    else if(room.level>=5 && roll<.13) kind="sniper";
    else if(roll<.18+room.level*.035) kind="heavy";
    else if(roll<.50) kind="fast";
    if(createEnemy(room,kind)) room.enemyRemain--;
    room.spawnTimer=0;
  }
  if(!freeze){
    for(const e of room.enemies){
      e.moveTimer--; if(e.moveTimer<=0){ const dirs=["down","left","right","up"]; e.dir=Math.random()<.52?"down":dirs[Math.floor(Math.random()*4)]; e.moveTimer=25+Math.random()*55; }
      let dx=0,dy=0; if(e.dir==="up")dy=-e.speed;if(e.dir==="down")dy=e.speed;if(e.dir==="left")dx=-e.speed;if(e.dir==="right")dx=e.speed;
      if(!blocked(room,e.x+dx,e.y+dy,e.size,false)){ e.x+=dx;e.y+=dy; } else if(Math.random()<.12) e.moveTimer=0;
      if(e.cooldown>0)e.cooldown--;
      if(Math.random() < (e.kind==="sniper"?.032:e.kind==="boss"?.045:.016+room.level*.002)) shoot(room,"enemy",e);
    }
  }
  for(const b of room.bullets){ if(b.dir==="up")b.y-=b.speed;if(b.dir==="down")b.y+=b.speed;if(b.dir==="left")b.x-=b.speed;if(b.dir==="right")b.x+=b.speed; }
  for(let i=room.bullets.length-1;i>=0;i--){
    const b=room.bullets[i];
    if(b.x<-15||b.y<-15||b.x>W+15||b.y>H+15){room.bullets.splice(i,1);continue;}
    const c=Math.floor((b.x+b.size/2)/TILE), r=Math.floor((b.y+b.size/2)/TILE);
    const tile=room.map[r]?.[c]??EMPTY;
    if(tile===BRICK){ room.map[r][c]=EMPTY; addEffect(room,"boom",c*TILE+16,r*TILE+16); if(!b.laser) room.bullets.splice(i,1); continue; }
    if(tile===STEEL||tile===WATER){ addEffect(room,"spark",b.x,b.y); if(!b.laser) room.bullets.splice(i,1); continue; }
    if(tile===BASE){ room.map[r][c]=EMPTY; room.baseAlive=false; room.state="gameover"; room.message="基地被摧毁"; broadcast(room,{type:"end", result:"lose", message:room.message}); continue; }
    if(b.owner==="player"){
      for(let j=room.enemies.length-1;j>=0;j--){
        const e=room.enemies[j];
        if(rect(b,e)){
          if(!b.laser) room.bullets.splice(i,1);
          e.hp--; addEffect(room,"spark",b.x,b.y);
          if(e.hp<=0){
            room.enemies.splice(j,1); addEffect(room,"boom",e.x+15,e.y+15);
            const p=room.players.get(b.ownerId); const coin=Math.ceil(e.score/55);
            room.score+=e.score; room.coins+=coin; if(p){p.score+=e.score;p.coins+=coin;}
            if(Math.random()<.32) power(room,e.x,e.y);
          }
          break;
        }
      }
    } else {
      for(const p of room.players.values()){
        if(p.alive && rect(b,p)){
          room.bullets.splice(i,1);
          if(p.buffs.shield>0){p.buffs.shield=0;addEffect(room,"text",p.x,p.y,"护盾抵挡");}
          else { p.life--; addEffect(room,"boom",p.x+15,p.y+15); if(p.life<=0)p.alive=false; else {const pos=spawnPos(0);p.x=pos.x;p.y=pos.y;p.dir="up";} }
          break;
        }
      }
    }
  }
  for(let i=room.powerUps.length-1;i>=0;i--){
    const u=room.powerUps[i]; u.life--; if(u.life<=0){room.powerUps.splice(i,1);continue;}
    for(const p of room.players.values()){
      if(!p.alive) continue;
      const range = p.buffs.magnet>0?120:34;
      const dx=(p.x+15)-(u.x+13), dy=(p.y+15)-(u.y+13);
      if(Math.hypot(dx,dy)<range && Math.hypot(dx,dy)>18){ u.x+=dx*.08; u.y+=dy*.08; }
      if(rect(u,p)){ applyPower(room,p,u.type); room.powerUps.splice(i,1); break; }
    }
  }
  room.effects.forEach(e=>e.life--); room.effects=room.effects.filter(e=>e.life>0);
  if(room.state==="playing" && room.enemyRemain<=0 && room.enemies.length===0){
    room.state="win"; room.coins+=LEVELS[room.level-1].reward; room.message=`通关成功！房间获得 ${room.coins} 金币`; broadcast(room,{type:"end", result:"win", message:room.message});
  }
  if(room.state==="playing" && [...room.players.values()].every(p=>!p.alive)){
    room.state="gameover"; room.message="全员被击毁"; broadcast(room,{type:"end", result:"lose", message:room.message});
  }
  broadcast(room,{type:"state", state:serialize(room)});
 }
}
function applyPower(room,p,type){
  if(type==="life") p.life=Math.min(12,p.life+1);
  if(type==="speed") p.buffs.speed=650;
  if(type==="double") p.buffs.double=650;
  if(type==="shield") p.buffs.shield=650;
  if(type==="bomb"){ room.enemies.forEach(e=>addEffect(room,"boom",e.x+15,e.y+15)); room.score+=room.enemies.length*80; room.enemies=[]; }
  if(type==="freeze") for(const q of room.players.values()) q.buffs.freeze=300;
  if(type==="repair") repairBase(room,false);
  if(type==="wall") repairBase(room,true);
  if(type==="laser") p.buffs.laser=520;
  if(type==="coin"){ p.coins+=30+room.level*15; room.coins+=30+room.level*15; }
  if(type==="ghost") p.buffs.ghost=420;
  if(type==="magnet") p.buffs.magnet=700;
  addEffect(room,"text",p.x,p.y,type);
}
function serialize(room){
  return { code:room.code, level:room.level, state:room.state, map:room.map, score:room.score, coins:room.coins, enemyRemain:room.enemyRemain,
    players:[...room.players.values()].map(p=>({id:p.id,nick:p.nick,skin:p.skin,color:SKINS[p.skin],x:p.x,y:p.y,size:p.size,dir:p.dir,life:p.life,score:p.score,coins:p.coins,alive:p.alive,buffs:p.buffs})),
    bullets:room.bullets.map(b=>({x:b.x,y:b.y,size:b.size,laser:b.laser,owner:b.owner})),
    enemies:room.enemies.map(e=>({id:e.id,x:e.x,y:e.y,size:e.size,dir:e.dir,kind:e.kind,hp:e.hp,maxHp:e.maxHp,color:e.color})),
    powerUps:room.powerUps.map(u=>({x:u.x,y:u.y,size:u.size,type:u.type,life:u.life})),
    effects:room.effects };
}
setInterval(step,TICK);
server.listen(PORT, () => console.log(`Tank Online running on http://localhost:${PORT}`));