const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

const TICK=1000/30, W=672, H=672, TILE=32, BRICK=1, STEEL=2, WATER=3, GRASS=4, BASE=5, REINFORCED=6;
const SKINS={green:'#22c55e',blue:'#38bdf8',gold:'#facc15',pink:'#fb7185',purple:'#a855f7',black:'#64748b',lava:'#f97316',cyber:'#14b8a6'};
const CLASSES={none:'无技能',assault:'突击手',guardian:'守护者',medic:'维修兵',scout:'侦察兵',bomber:'爆破手'};
const LEVELS=[
{name:"训练营",enemyTotal:16,reward:120,map:[".....................","..B..B..B...B..B..B..","..B..B..B...B..B..B..",".....................","....SS.......SS......",".....................","..BB....BBB....BB....","..BB.....G.....BB....","..........W..........","..........W..........","....BB.........BB....","....BB.........BB....","..........G..........","..SS.............SS..",".....................","..B..B..B...B..B..B..","..B..B..B...B..B..B..",".........BBB.........",".........BEB.........","........BBBBB........","....................."]},
{name:"河道防线",enemyTotal:22,reward:180,map:[".....................",".BBB....SSSSS....BBB.",".B.................B.",".B..GG.........GG..B.","....GG.........GG....",".........WWW.........","BBBB.....WWW.....BBBB",".........WWW.........","....SS.........SS....",".....................","..BBBBB.....BBBBB....",".....................","....SS...GGG...SS....",".........GGG.........","BBBB.............BBBB","....WWW.......WWW....","....WWW.......WWW....",".........BBB.........",".........BEB.........","........BBBBB........","....................."]},
{name:"钢铁迷宫",enemyTotal:28,reward:260,map:[".....................","SSS..BBB.....BBB..SSS",".....B.........B.....",".BBB.B.SSSSSSS.B.BBB.",".B...B.........B...B.",".B.SSS..WWW..SSS.B...",".B......WWW......B...",".BBBBB.......BBBBB...",".......GGGGG.........","SSS...............SSS",".....BBB.....BBB.....","SSS...............SSS",".......GGGGG.........",".BBBBB.......BBBBB...",".B......WWW......B...",".B.SSS..WWW..SSS.B...",".B...B.........B...B.",".....B...BBB...B.....",".........BEB.........","........BBBBB........","....................."]},
{name:"草丛伏击",enemyTotal:34,reward:340,map:[".....................","..GGGGG.......GGGGG..","..GBBBG.......GBBBG..","..G...G..SSS..G...G..","..G...G.......G...G..","BBBB....GGGGG....BBBB","........G...G........","..SS....G...G....SS..","........GGGGG........","....WWW.......WWW....","....WWW.......WWW....","........GGGGG........","..SS....G...G....SS..","........G...G........","BBBB....GGGGG....BBBB","..G...G.......G...G..","..G...G..BBB..G...G..","........BBB..........",".........BEB.........","........BBBBB........","....................."]},
{name:"十字火线",enemyTotal:40,reward:460,map:[".....................","BBBBB.....S.....BBBBB","....B.....S.....B....","....B.....S.....B....","....B.....S.....B....","SSSSS.....S.....SSSSS",".....................","....BBB.......BBB....","....B...........B....","SSSSS....WWW....SSSSS",".........WWW.........","SSSSS....WWW....SSSSS","....B...........B....","....BBB.......BBB....",".....................","SSSSS.....S.....SSSSS","....B.....S.....B....","....B....BBB....B....",".........BEB.........","........BBBBB........","....................."]},
{name:"孤岛基地",enemyTotal:46,reward:580,map:[".....................","..BBBB.........BBBB..","..B..B.........B..B..","..B..B..WWWWW..B..B..","........W...W........","SSSS....W...W....SSSS","........W...W........","..GGG...W...W...GGG..","..G.....WWWWW.....G..","..G...............G..","..G....SSSSSSS....G..","..G...............G..","..G.....WWWWW.....G..","..GGG...W...W...GGG..","........W...W........","SSSS....W...W....SSSS","........W...W........",".......BBBBBBB.......",".........BEB.........","........BBBBB........","....................."]},
{name:"沙漠突袭",enemyTotal:48,reward:640,map:[".....................","..B...............B..","..B..BBB.....BBB..B..",".....B.........B.....","SS...B..GGGGG..B...SS",".....B.........B.....","..BBBB.........BBBB..",".....................","....WWW.......WWW....","....WWW.......WWW....",".........SSS.........","....WWW.......WWW....","....WWW.......WWW....",".....................","..BBBB.........BBBB..",".....B.........B.....","SS...B...BBB...B...SS",".....B...BBB...B.....",".........BEB.........","........BBBBB........","....................."]},
{name:"炮火工厂",enemyTotal:54,reward:720,map:[".....................","SS.BBB.SSSSS.BBB.SS..","...B.........B.......","...B..SS.SS..B..SS...","BBBB..S...S..BBBB....","......S...S..........","..SS..S...S..SS..SS..","......SS.SS..........","BBBB.............BBBB","....GGG.....GGG......","....GGG.WWW.GGG......","....GGG.....GGG......","BBBB.............BBBB","......SS.SS..........","..SS..S...S..SS..SS..","......S...S..........","BBBB..S...S..BBBB....","...B....BBB....B.....",".........BEB.........","........BBBBB........","....................."]},
{name:"冰霜要塞",enemyTotal:38,reward:900,boss:true,map:[".....................","SSS....BBBBB....SSS..","..S....BWWWB....S....","..S.GG.BW.WB.GG.S....","BBB.GG.BW.WB.GG.BBB..","....GG.BW.WB.GG......","....SS.B...B.SS......","WWWW...BBBBB...WWWW..","W.....GGGGGGG.....W..","W.SSS.G.....G.SSS.W..","W.....G..S..G.....W..","W.SSS.G.....G.SSS.W..","W.....GGGGGGG.....W..","WWWW...BBBBB...WWWW..","....SS.......SS......","BBBB....GGG....BBBB..","..B......BBB......B..","..B......BBB......B..",".........BEB.........","........BBBBB........","....................."]},
{name:"雷霆核心",enemyTotal:44,reward:1050,boss:true,map:[".....................","..SSS...BBBBB...SSS..","..S.....B...B.....S..","BBB..GG.B.S.B.GG..BBB",".....GG.B.S.B.GG.....","SSSS....B.S.B....SSSS","........B...B........","..BBBBBBBBBBBBBBB....","..B.....GGGGG...B....","..B.SSS.G...G.SSB....","..B.....G.W.G...B....","..B.SSS.G...G.SSB....","..B.....GGGGG...B....","..BBBBBBBBBBBBBBB....",".............WWW.....","SSSS....GGG....SSSS..",".....B.......B.......",".....B...BBB.B.......",".........BEB.........","........BBBBB........","....................."]},
{name:"暗影迷城",enemyTotal:50,reward:1200,boss:true,map:[".....................","GGGGG.BBB...BBB.GGGGG","G...G.B.......B.G...G","G.S.G.B.SSSSS.B.G.SG.","G...G...........G...G","GGGGG..WWWWW..GGGGG..","....B..W...W..B......","SSS.B..W...W..B.SSS..","....B..WWWWW..B......","..GGGG.........GGGG..","..G..G...SSS...G..G..","..GGGG.........GGGG..","....B..WWWWW..B......","SSS.B..W...W..B.SSS..","....B..W...W..B......","GGGGG..WWWWW..GGGGG..","G...G....BBB....G...G","G.S.G....BBB....G.S.G",".........BEB.........","........BBBBB........","....................."]},
{name:"终极堡垒",enemyTotal:56,reward:1500,boss:true,map:[".....................","SSS.BBB.WWW.BBB.SSS..","....B...W.W...B......",".BB.B.S.W.W.S.B.BB...",".B....S.W.W.S....B...",".B.SSSS.W.W.SSSS.B...","...S....W.W....S.....","GGGG..BBBBBBB..GGGG..","G.....B.....B.....G..","G.SSS.B.WWW.B.SSS.G..","G.....B.WWW.B.....G..","G.SSS.B.WWW.B.SSS.G..","G.....B.....B.....G..","GGGG..BBBBBBB..GGGG..","...S....W.W....S.....",".B.SSSS.W.W.SSSS.B...",".B....S.....S....B...",".BB.B...BBB...B.BB...",".........BEB.........","........BBBBB........","....................."]}
];
const rooms=new Map(); let nextPlayerId=1;
function parseMap(level){return LEVELS[level-1].map.map(row=>row.split('').map(ch=>ch==='B'?BRICK:ch==='S'?STEEL:ch==='W'?WATER:ch==='G'?GRASS:ch==='E'?BASE:0));}
function roomCode(){let s;do{s=Math.random().toString(36).slice(2,6).toUpperCase()}while(rooms.has(s));return s;}
function spawnPos(i){return [{x:9*TILE+1,y:20*TILE+1},{x:11*TILE+1,y:20*TILE+1},{x:8*TILE+1,y:19*TILE+1},{x:12*TILE+1,y:19*TILE+1}][i%4];}
function send(ws,obj){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj));}
function broadcast(room,obj){for(const p of room.players.values())send(p.ws,obj);}
function makeRoom(code,level=1,hostId=null,opts={}){return{code,level,hostId,roomName:(opts.roomName||'').slice(0,14),isPublic:opts.isPublic!==false,state:'lobby',map:parseMap(level),players:new Map(),bullets:[],enemies:[],powerUps:[],effects:[],enemyRemain:LEVELS[level-1].enemyTotal,spawnTimer:0,tick:0,score:0,coins:0,message:'等待玩家准备',baseAlive:true}};
function publicRoom(room){return{code:room.code,level:room.level,state:room.state,hostId:room.hostId,roomName:room.roomName,isPublic:room.isPublic,players:[...room.players.values()].map(p=>({id:p.id,nick:p.nick,skin:p.skin,ready:p.ready,life:p.life,score:p.score,coins:p.coins,classId:p.classId})),maxPlayers:4};}
function blocked(room,x,y,size,ghost=false){if(x<0||y<0||x+size>W||y+size>H)return true;const l=Math.floor(x/TILE),r=Math.floor((x+size-1)/TILE),t=Math.floor(y/TILE),b=Math.floor((y+size-1)/TILE);for(let row=t;row<=b;row++)for(let col=l;col<=r;col++){const tile=room.map[row]?.[col]??STEEL;if(ghost&&[BRICK,STEEL,WATER].includes(tile))continue;if([BRICK,STEEL,WATER,BASE,REINFORCED].includes(tile))return true;}return false;}
function rect(a,b){return a.x<b.x+b.size&&a.x+a.size>b.x&&a.y<b.y+b.size&&a.y+a.size>b.y;}
function levelList(){return LEVELS.map((l,i)=>({i:i+1,name:l.name,reward:l.reward,enemyTotal:l.enemyTotal,desc:l.desc||'',boss:!!l.boss}));}

function publicRoomList(){return[...rooms.values()].filter(r=>r.isPublic&&r.state==='lobby').map(r=>{const ps=[...r.players.values()];const host=ps.find(p=>p.id===r.hostId)||ps[0];return{code:r.code,roomName:r.roomName||`${host?.nick||'玩家'}的房间`,level:r.level,levelName:LEVELS[r.level-1]?.name||'',count:ps.length,maxPlayers:4,readyCount:ps.filter(p=>p.ready).length,hostNick:host?.nick||'房主'};});}
function sendRoomList(ws){send(ws,{type:'roomList',rooms:publicRoomList()});}
function broadcastRoomList(){for(const client of wss.clients)if(client.readyState===WebSocket.OPEN)sendRoomList(client);}

function newPlayer(ws,msg,idx){const pos=spawnPos(idx);const u=msg.upgrades||{};return{id:'P'+nextPlayerId++,ws,nick:(msg.nick||'玩家').slice(0,10),skin:SKINS[msg.skin]?msg.skin:'green',classId:CLASSES[msg.classId]?msg.classId:'none',x:pos.x,y:pos.y,size:30,dir:'up',input:{},ready:false,life:3+(u.life||0),maxLife:3+(u.life||0),extraRevive:u.revive||0,score:0,coins:0,cooldown:0,skillCooldown:0,buffs:{speed:0,double:0,shield:0,freeze:0,laser:0,ghost:0,magnet:0,drone:0,rapid:0},alive:true,upgrades:{life:u.life||0,fire:u.fire||0,speed:u.speed||0,magnet:u.magnet||0,income:u.income||0,revive:u.revive||0}};}
function startRoom(room,level=room.level){room.level=level;room.state='playing';room.map=parseMap(level);room.bullets=[];room.enemies=[];room.powerUps=[];room.effects=[];room.enemyRemain=LEVELS[level-1].enemyTotal;room.spawnTimer=0;room.tick=0;room.score=0;room.coins=0;room.baseAlive=true;room.message='战斗开始';let i=0;for(const p of room.players.values()){const pos=spawnPos(i++);Object.assign(p,{x:pos.x,y:pos.y,dir:'up',life:p.maxLife,score:0,coins:0,cooldown:0,skillCooldown:0,alive:true,ready:false});p.buffs={speed:0,double:0,shield:0,freeze:0,laser:0,ghost:0,magnet:0,drone:0,rapid:0};}broadcast(room,{type:'start',room:publicRoom(room)});}
function createEnemy(room,kind){const spots=[{x:0,y:0},{x:5*TILE,y:0},{x:10*TILE,y:0},{x:15*TILE,y:0},{x:20*TILE-30,y:0}],sp=spots[Math.floor(Math.random()*spots.length)];if(blocked(room,sp.x,sp.y,30,false))return false;const stat={normal:{hp:1,speed:1.2,color:'#ef4444',score:100},fast:{hp:1,speed:2.0,color:'#f97316',score:150},heavy:{hp:3,speed:.9,color:'#a855f7',score:250},sniper:{hp:1,speed:1.0,color:'#06b6d4',score:220},suicide:{hp:1,speed:2.45,color:'#f59e0b',score:180},shield:{hp:2,speed:1.05,color:'#22d3ee',score:260},elite:{hp:4,speed:1.35,color:'#84cc16',score:360},bossFrost:{hp:18,speed:.62,color:'#60a5fa',score:1700},bossThunder:{hp:20,speed:.82,color:'#facc15',score:1900},bossShadow:{hp:22,speed:.92,color:'#7c3aed',score:2100},bossDoom:{hp:28,speed:.76,color:'#be123c',score:2600},boss:{hp:16,speed:.7,color:'#be123c',score:1500}}[kind];room.enemies.push({id:'E'+Math.random().toString(36).slice(2,8),x:sp.x,y:sp.y,size:30,dir:'down',kind,hp:stat.hp,maxHp:stat.hp,speed:stat.speed,color:stat.color,score:stat.score,cooldown:60,moveTimer:20});return true;}
function shoot(room,owner,tank){if(tank.cooldown>0)return;const laser=owner==='player'&&tank.buffs.laser>0,double=owner==='player'&&tank.buffs.double>0;for(const side of (double?[-1,1]:[0])){let x=tank.x+tank.size/2-4,y=tank.y+tank.size/2-4,s=side*7;if(tank.dir==='up'){y-=13;x+=s}if(tank.dir==='down'){y+=13;x+=s}if(tank.dir==='left'){x-=13;y+=s}if(tank.dir==='right'){x+=13;y+=s}room.bullets.push({id:'B'+Math.random().toString(36).slice(2,8),x,y,size:laser?10:8,dir:tank.dir,speed:owner==='player'?(laser?9:6.5):4.7,owner,ownerId:tank.id,laser});}tank.cooldown=owner==='player'?Math.max(5,(tank.buffs?.rapid>0?7:(laser?12:18))-(tank.upgrades?.fire||0)*3):(tank.kind==='sniper'?45:(String(tank.kind).startsWith('boss')?38:75));}
function effect(room,type,x,y,text=''){room.effects.push({type,x,y,text,life:35});}
function power(room,x,y){const types=['life','speed','double','shield','bomb','freeze','repair','laser','coin','wall','ghost','magnet','drone','heartRain','rapid','nuke','star','barrier'];room.powerUps.push({id:'U'+Math.random().toString(36).slice(2,8),x,y,size:26,type:types[Math.floor(Math.random()*types.length)],life:600});}
function repairBase(room,mode='repair'){
  const cells=[[17,9],[17,10],[17,11],[18,9],[18,11],[19,8],[19,9],[19,10],[19,11],[19,12]];
  for(const [r,c] of cells){
    if(!room.map[r] || room.map[r][c]===BASE) continue;
    if(mode==='reinforce') room.map[r][c]=REINFORCED;
    else if(mode==='repair' && room.map[r][c]===0) room.map[r][c]=BRICK;
  }
}
function damageEnemyByPower(room,e,damage){
  if(String(e.kind).startsWith('boss')){e.hp=Math.max(1,e.hp-damage);return false;}
  e.hp-=damage;return e.hp<=0;
}
function applyPower(room,p,type){
  if(type==='life')p.life=Math.min(p.maxLife+3,p.life+1);
  if(type==='speed')p.buffs.speed=700;
  if(type==='double')p.buffs.double=700;
  if(type==='shield')p.buffs.shield=700;
  if(type==='freeze')for(const q of room.players.values())q.buffs.freeze=300;
  if(type==='laser')p.buffs.laser=520;
  if(type==='ghost')p.buffs.ghost=420;
  if(type==='magnet')p.buffs.magnet=700;
  if(type==='drone')p.buffs.drone=700;
  if(type==='rapid')p.buffs.rapid=520;
  if(type==='star'){p.buffs.shield=700;p.buffs.double=600;p.buffs.speed=600;p.buffs.laser=360}
  if(type==='barrier'||type==='wall')repairBase(room,'reinforce');
  if(type==='repair')repairBase(room,'repair');
  if(type==='coin'){const add=30+room.level*15+(p.upgrades.income||0)*10;p.coins+=add;room.coins+=add;}
  if(type==='heartRain')for(const q of room.players.values())if(q.alive)q.life=Math.min(q.maxLife+3,q.life+1);
  if(type==='bomb'||type==='nuke'){
    const dmg=type==='nuke'?8:3;
    for(let i=room.enemies.length-1;i>=0;i--){const e=room.enemies[i];room.score+=type==='nuke'?120:60;room.coins+=type==='nuke'?3+(p.upgrades.income||0):1+(p.upgrades.income||0);effect(room,'boom',e.x+15,e.y+15);if(damageEnemyByPower(room,e,dmg))room.enemies.splice(i,1);}
  }
  effect(room,'text',p.x,p.y,type);
}

function useSkill(room,p){
  if(!room||!p||!p.alive||room.state!=='playing'||p.skillCooldown>0)return;
  const cid=p.classId||'none';if(cid==='none'){effect(room,'text',p.x,p.y,'未购买技能');return;}
  p.skillCooldown=900;
  if(cid==='assault'){
    p.buffs.rapid=240;p.buffs.double=240;effect(room,'text',p.x,p.y,'火力全开');
  }else if(cid==='guardian'){
    p.buffs.shield=360;repairBase(room,'reinforce');effect(room,'text',p.x,p.y,'堡垒护盾');
  }else if(cid==='medic'){
    for(const q of room.players.values())if(q.alive)q.life=Math.min(q.maxLife+2,q.life+1);
    repairBase(room,'repair');effect(room,'text',p.x,p.y,'紧急维修');
  }else if(cid==='scout'){
    p.buffs.speed=330;p.buffs.ghost=240;p.buffs.magnet=360;effect(room,'text',p.x,p.y,'幽灵突袭');
  }else if(cid==='bomber'){
    applyPower(room,p,'nuke');effect(room,'text',p.x,p.y,'战术核弹');
  }
}
function serialize(room){return{code:room.code,level:room.level,state:room.state,map:room.map,score:room.score,coins:room.coins,enemyRemain:room.enemyRemain,message:room.message,players:[...room.players.values()].map(p=>({id:p.id,nick:p.nick,skin:p.skin,classId:p.classId,skillCooldown:p.skillCooldown||0,color:SKINS[p.skin],x:p.x,y:p.y,size:p.size,dir:p.dir,life:p.life,maxLife:p.maxLife,score:p.score,coins:p.coins,alive:p.alive,buffs:p.buffs})),bullets:room.bullets.map(b=>({x:b.x,y:b.y,size:b.size,laser:b.laser,owner:b.owner})),enemies:room.enemies.map(e=>({id:e.id,x:e.x,y:e.y,size:e.size,dir:e.dir,kind:e.kind,hp:e.hp,maxHp:e.maxHp,color:e.color})),powerUps:room.powerUps.map(u=>({x:u.x,y:u.y,size:u.size,type:u.type,life:u.life})),effects:room.effects};}
wss.on('connection',ws=>{let myRoom=null,me=null;send(ws,{type:'hello'});ws.on('message',raw=>{let msg;try{msg=JSON.parse(raw)}catch{return}if(msg.type==='listRooms'){sendRoomList(ws);return}if(msg.type==='create'){const code=roomCode(),room=makeRoom(code,Math.max(1,Math.min(LEVELS.length,Number(msg.level)||1)),null,{roomName:msg.roomName,isPublic:msg.isPublic!==false});rooms.set(code,room);me=newPlayer(ws,msg,0);room.hostId=me.id;room.players.set(me.id,me);myRoom=room;send(ws,{type:'joined',selfId:me.id,room:publicRoom(room),levels:levelList()});broadcast(room,{type:'room',room:publicRoom(room)});broadcastRoomList();return}if(msg.type==='join'){const code=String(msg.code||'').toUpperCase().trim(),room=rooms.get(code);if(!room)return send(ws,{type:'error',message:'房间不存在'});if(room.players.size>=4)return send(ws,{type:'error',message:'房间已满'});if(room.state!=='lobby')return send(ws,{type:'error',message:'游戏已经开始'});me=newPlayer(ws,msg,room.players.size);room.players.set(me.id,me);myRoom=room;send(ws,{type:'joined',selfId:me.id,room:publicRoom(room),levels:levelList()});broadcast(room,{type:'room',room:publicRoom(room)});broadcastRoomList();return}if(!myRoom||!me)return;if(msg.type==='input')me.input=msg.input||{};if(msg.type==='skill')useSkill(myRoom,me);if(msg.type==='ready'){me.ready=!!msg.ready;broadcast(myRoom,{type:'room',room:publicRoom(myRoom)});broadcastRoomList()}if(msg.type==='level'&&me.id===myRoom.hostId&&myRoom.state==='lobby'){myRoom.level=Math.max(1,Math.min(LEVELS.length,Number(msg.level)||myRoom.level));broadcast(myRoom,{type:'room',room:publicRoom(myRoom)});broadcastRoomList()}if(msg.type==='restart'&&me.id===myRoom.hostId){startRoom(myRoom,myRoom.level);return}if(msg.type==='next'&&me.id===myRoom.hostId){startRoom(myRoom,Math.min(LEVELS.length,myRoom.level+1));return}if(msg.type==='start'){if(me.id!==myRoom.hostId)return send(ws,{type:'error',message:'只有房主可以开始'});const ps=[...myRoom.players.values()];if(ps.some(p=>!p.ready))return send(ws,{type:'error',message:'还有玩家没准备，不能开始'});startRoom(myRoom,myRoom.level);broadcastRoomList()}if(msg.type==='chat')broadcast(myRoom,{type:'chat',nick:me.nick,text:String(msg.text||'').slice(0,60)});});ws.on('close',()=>{if(myRoom&&me){const wasHost=myRoom.hostId===me.id;myRoom.players.delete(me.id);if(wasHost&&myRoom.players.size>0)myRoom.hostId=[...myRoom.players.keys()][0];broadcast(myRoom,{type:'room',room:publicRoom(myRoom)});if(myRoom.players.size===0)rooms.delete(myRoom.code);broadcastRoomList();}});});

function hurtPlayer(room,p,damage=1){
  if(!p.alive)return;
  if(p.buffs.shield>0){p.buffs.shield=0;effect(room,'spark',p.x+15,p.y+15);return;}
  p.life-=damage;effect(room,'boom',p.x+15,p.y+15);
  if(p.life<=0){
    if(p.extraRevive>0){p.extraRevive--;p.life=1;const pos=spawnPos([...room.players.values()].indexOf(p));p.x=pos.x;p.y=pos.y;effect(room,'text',p.x,p.y,'复活');}
    else p.alive=false;
  }else{const pos=spawnPos([...room.players.values()].indexOf(p));p.x=pos.x;p.y=pos.y;}
}


function bossAbility(room,e){
  if(!String(e.kind).startsWith('boss'))return;
  if(e.kind==='bossFrost'&&room.tick%150===0){for(const p of room.players.values())if(p.alive)p.buffs.freeze=90;effect(room,'text',e.x,e.y,'冰霜领域');}
  if(e.kind==='bossThunder'&&room.tick%120===0){for(const dir of ['up','down','left','right'])room.bullets.push({id:'BT'+Math.random(),x:e.x+11,y:e.y+11,size:10,dir,speed:5.6,owner:'enemy',ownerId:e.id,laser:true});effect(room,'text',e.x,e.y,'雷霆齐射');}
  if(e.kind==='bossShadow'&&room.tick%170===0){e.x=Math.max(0,Math.min(W-30,e.x+(Math.random()-.5)*220));e.y=Math.max(0,Math.min(H/2,e.y+(Math.random()-.5)*160));createEnemy(room,'fast');effect(room,'text',e.x,e.y,'暗影召唤');}
  if(e.kind==='bossDoom'&&room.tick%210===0){for(const p of room.players.values())if(p.alive)hurtPlayer(room,p,1);effect(room,'text',e.x,e.y,'末日冲击');}
}

function step(){for(const room of rooms.values()){if(room.state!=='playing')continue;room.tick++;const freeze=[...room.players.values()].some(p=>p.buffs.freeze>0);for(const p of room.players.values()){if(!p.alive)continue;let sp=2.55+(p.upgrades.speed||0)*.25+(p.buffs.speed>0?1.05:0),dx=0,dy=0;if(p.input.up){dy=-sp;p.dir='up'}else if(p.input.down){dy=sp;p.dir='down'}else if(p.input.left){dx=-sp;p.dir='left'}else if(p.input.right){dx=sp;p.dir='right'}if((dx||dy)&&!blocked(room,p.x+dx,p.y+dy,p.size,p.buffs.ghost>0)){p.x+=dx;p.y+=dy}if(p.cooldown>0)p.cooldown--;if(p.skillCooldown>0)p.skillCooldown--;for(const k of Object.keys(p.buffs))if(p.buffs[k]>0)p.buffs[k]--;if(p.input.shoot)shoot(room,'player',p);if(p.buffs.drone>0&&room.tick%25===0)shoot(room,'player',{...p,cooldown:0,dir:p.dir,id:p.id,upgrades:p.upgrades,buffs:{...p.buffs,double:0,laser:0}})}room.spawnTimer++;if(room.spawnTimer>Math.max(35,95-room.level*7)&&room.enemyRemain>0){let kind='normal',roll=Math.random();if(LEVELS[room.level-1].boss&&room.enemyRemain===1){const bosses=['bossFrost','bossThunder','bossShadow','bossDoom'];kind=bosses[Math.min(bosses.length-1,Math.max(0,room.level-9))]||'bossDoom';}else if(room.level>=8&&roll<.08)kind='elite';else if(room.level>=7&&roll<.15)kind='shield';else if(room.level>=6&&roll<.22)kind='suicide';else if(room.level>=5&&roll<.30)kind='sniper';else if(roll<.18+room.level*.035)kind='heavy';else if(roll<.56)kind='fast';if(createEnemy(room,kind))room.enemyRemain--;room.spawnTimer=0}if(!freeze)for(const e of room.enemies){e.moveTimer--;if(e.moveTimer<=0){const dirs=['down','left','right','up'];e.dir=Math.random()<.52?'down':dirs[Math.floor(Math.random()*4)];e.moveTimer=25+Math.random()*55}let dx=0,dy=0;if(e.dir==='up')dy=-e.speed;if(e.dir==='down')dy=e.speed;if(e.dir==='left')dx=-e.speed;if(e.dir==='right')dx=e.speed;if(!blocked(room,e.x+dx,e.y+dy,e.size,false)){e.x+=dx;e.y+=dy}else if(Math.random()<.12)e.moveTimer=0;if(e.cooldown>0)e.cooldown--;if(e.kind!=='suicide' && Math.random()<(e.kind==='sniper'?.032:String(e.kind).startsWith('boss')?.048:.016+room.level*.002))shoot(room,'enemy',e);bossAbility(room,e)}for(const b of room.bullets){if(b.dir==='up')b.y-=b.speed;if(b.dir==='down')b.y+=b.speed;if(b.dir==='left')b.x-=b.speed;if(b.dir==='right')b.x+=b.speed}for(let i=room.bullets.length-1;i>=0;i--){const b=room.bullets[i];if(b.x<-20||b.y<-20||b.x>W+20||b.y>H+20){room.bullets.splice(i,1);continue}const c=Math.floor((b.x+b.size/2)/TILE),r=Math.floor((b.y+b.size/2)/TILE),tile=room.map[r]?.[c];if(tile===REINFORCED){room.map[r][c]=BRICK;if(!b.laser)room.bullets.splice(i,1);effect(room,'spark',c*TILE+16,r*TILE+16)}else if(tile===BRICK){room.map[r][c]=0;if(!b.laser)room.bullets.splice(i,1);effect(room,'boom',c*TILE+16,r*TILE+16)}else if(tile===STEEL||tile===WATER){if(!b.laser)room.bullets.splice(i,1);effect(room,'spark',b.x,b.y)}else if(tile===BASE){room.map[r][c]=0;room.baseAlive=false;room.state='gameover';room.message='基地被摧毁';room.bullets.splice(i,1)}}for(let i=room.bullets.length-1;i>=0;i--){const b=room.bullets[i];if(b.owner==='player'){for(let j=room.enemies.length-1;j>=0;j--){const e=room.enemies[j];if(rect(b,e)){if(!b.laser)room.bullets.splice(i,1);e.hp--;effect(room,'spark',b.x,b.y);if(e.hp<=0){room.enemies.splice(j,1);const owner=room.players.get(b.ownerId);const gain=e.score+(owner?.upgrades.income||0)*30;room.score+=gain;room.coins+=Math.ceil(gain/50);if(owner){owner.score+=gain;owner.coins+=Math.ceil(gain/50)}effect(room,'boom',e.x+15,e.y+15);if(Math.random()<.32)power(room,e.x,e.y)}if(!b.laser)break}}}else{for(const p of room.players.values())if(p.alive&&rect(b,p)){room.bullets.splice(i,1);hurtPlayer(room,p,1);break}}}
for(let ei=room.enemies.length-1;ei>=0;ei--){
  const e=room.enemies[ei];
  for(const p of room.players.values()){
    if(p.alive&&rect(e,p)){
      hurtPlayer(room,p,String(e.kind).startsWith('boss')?2:1);
      effect(room,'boom',p.x+15,p.y+15);
      if(String(e.kind).startsWith('boss')){e.hp=Math.max(1,e.hp-1);} else {room.enemies.splice(ei,1);} 
      break;
    }
  }
}
for(let i=room.powerUps.length-1;i>=0;i--){const u=room.powerUps[i];u.life--;if(u.life<=0){room.powerUps.splice(i,1);continue}for(const p of room.players.values())if(p.alive){const range=26+(p.upgrades.magnet||0)*28+(p.buffs.magnet>0?95:0),dx=p.x+15-(u.x+13),dy=p.y+15-(u.y+13);if(Math.hypot(dx,dy)<range&&Math.hypot(dx,dy)>18){u.x+=dx*.08;u.y+=dy*.08}if(rect(u,p)){applyPower(room,p,u.type);room.powerUps.splice(i,1);break}}}room.effects.forEach(e=>e.life--);room.effects=room.effects.filter(e=>e.life>0);if(room.state==='playing'&&room.enemyRemain<=0&&room.enemies.length===0){room.state='win';room.message='通关成功';room.coins+=LEVELS[room.level-1].reward;broadcast(room,{type:'reward',coins:room.coins,score:room.score,level:room.level,win:true})}if(room.state==='playing'&&![...room.players.values()].some(p=>p.alive)){room.state='gameover';room.message='全员阵亡';broadcast(room,{type:'reward',coins:Math.floor(room.coins*.35),score:room.score,level:room.level,win:false})}broadcast(room,{type:'state',state:serialize(room)});}}
setInterval(step,TICK);
server.listen(PORT,()=>console.log(`Tank Online upgraded running on http://localhost:${PORT}`));
