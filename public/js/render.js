window.TankRenderer = (() => {
  const S = window.TANK_SHARED;
  const {TILE,BRICK,STEEL,WATER,GRASS,BASE,REINFORCED,POWER_ICON,POWER_NAME} = S;
  function drawTile(ctx,c,r,tile){const x=c*TILE,y=r*TILE;if(tile===BRICK){ctx.fillStyle='#92400e';ctx.fillRect(x+2,y+2,28,28);ctx.strokeStyle='#451a03';ctx.strokeRect(x+2,y+2,28,28);ctx.beginPath();ctx.moveTo(x+2,y+16);ctx.lineTo(x+30,y+16);ctx.moveTo(x+16,y+2);ctx.lineTo(x+16,y+30);ctx.stroke()}if(tile===REINFORCED){ctx.fillStyle='#b45309';ctx.fillRect(x+2,y+2,28,28);ctx.strokeStyle='#fde68a';ctx.lineWidth=2;ctx.strokeRect(x+5,y+5,22,22);ctx.strokeStyle='#451a03';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+2,y+16);ctx.lineTo(x+30,y+16);ctx.stroke()}if(tile===STEEL){ctx.fillStyle='#94a3b8';ctx.fillRect(x+2,y+2,28,28);ctx.fillStyle='#475569';ctx.fillRect(x+7,y+7,18,18)}if(tile===WATER){ctx.fillStyle='#2563eb';ctx.fillRect(x+2,y+2,28,28);ctx.fillStyle='#93c5fd';ctx.fillRect(x+6,y+12,20,4);ctx.fillRect(x+10,y+22,12,3)}if(tile===GRASS){ctx.fillStyle='rgba(22,101,52,.88)';ctx.fillRect(x+1,y+1,30,30);ctx.strokeStyle='#22c55e';for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(x+5+i*5,y+28);ctx.lineTo(x+10+i*4,y+6);ctx.stroke()}}if(tile===BASE){ctx.fillStyle='#facc15';ctx.fillRect(x+6,y+8,20,22);ctx.fillStyle='#78350f';ctx.fillRect(x+11,y+16,10,14);ctx.fillStyle='#fef3c7';ctx.beginPath();ctx.moveTo(x+16,y+4);ctx.lineTo(x+27,y+14);ctx.lineTo(x+5,y+14);ctx.closePath();ctx.fill()}}
  function drawTank(ctx,t){
    const sz=t.size||30,c=sz/2,scale=sz/30,kind=String(t.kind||'');
    ctx.save();
    ctx.translate(t.x+c,t.y+c);
    ctx.rotate({up:0,right:Math.PI/2,down:Math.PI,left:-Math.PI/2}[t.dir]||0);
    ctx.scale(scale,scale);
    const body=t.color||'#22c55e';
    ctx.shadowColor=kind.startsWith('boss')?'rgba(248,113,113,.65)':'rgba(0,0,0,.25)';
    ctx.shadowBlur=kind.startsWith('boss')?16:4;
    ctx.fillStyle=body;
    ctx.fillRect(-15,-15,30,30);
    ctx.shadowBlur=0;
    ctx.fillStyle='#111827';
    ctx.fillRect(-12,-12,6,24);
    ctx.fillRect(6,-12,6,24);
    ctx.fillStyle=t.owner==='enemy'?'#fee2e2':'#e5e7eb';
    ctx.fillRect(-4,-26,8,25);
    ctx.fillStyle=t.owner==='enemy'?'#fee2e2':'#fde68a';
    ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();

    if(kind==='fast'){
      ctx.fillStyle='#fff7ed'; ctx.fillRect(-13,-8,26,3); ctx.fillRect(-13,5,26,3);
    }
    if(kind==='heavy'){
      ctx.strokeStyle='#f5d0fe'; ctx.lineWidth=3; ctx.strokeRect(-13,-13,26,26);
      ctx.fillStyle='rgba(255,255,255,.28)'; ctx.fillRect(-7,-14,14,28);
    }
    if(kind==='sniper'){
      ctx.fillStyle='#cffafe'; ctx.fillRect(-2,-42,4,20);
      ctx.fillStyle='#67e8f9'; ctx.fillRect(-5,-38,10,4);
    }
    if(kind==='suicide'){
      ctx.strokeStyle='#fed7aa'; ctx.lineWidth=3; ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#fb923c'; ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(11,9);ctx.lineTo(-11,9);ctx.closePath();ctx.fill();
    }
    if(kind==='shield'){
      ctx.strokeStyle='#a5f3fc'; ctx.lineWidth=4; ctx.beginPath();ctx.arc(0,0,18,0,Math.PI*2);ctx.stroke();
    }
    if(kind==='elite'){
      ctx.strokeStyle='#bef264'; ctx.lineWidth=3; ctx.strokeRect(-14,-14,28,28);
      ctx.fillStyle='#ecfccb'; ctx.font='bold 13px Arial'; ctx.textAlign='center'; ctx.fillText('★',0,5);
    }
    if(kind.startsWith('boss')){
      ctx.strokeStyle=kind==='bossFrost'?'#bfdbfe':kind==='bossThunder'?'#fef08a':kind==='bossShadow'?'#ddd6fe':'#fecdd3';
      ctx.lineWidth=4;ctx.strokeRect(-16,-16,32,32);
      ctx.fillStyle='#fff';ctx.font='bold 12px Arial';ctx.textAlign='center';
      const label=kind==='bossFrost'?'ICE':kind==='bossThunder'?'THR':kind==='bossShadow'?'SHA':kind==='bossDoom'?'DOOM':'BOSS';
      ctx.fillText(label,0,4);
    }
    ctx.restore();
    if(t.maxHp>1){
      ctx.fillStyle='#111827';ctx.fillRect(t.x,t.y-8,sz,5);
      ctx.fillStyle=kind.startsWith('boss')?'#fb7185':'#f43f5e';ctx.fillRect(t.x,t.y-8,sz*t.hp/t.maxHp,5);
    }
    if(t.shield){ctx.strokeStyle='rgba(96,165,250,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(t.x+c,t.y+c,Math.max(20,sz*.8)+Math.sin(Date.now()/90)*2,0,Math.PI*2);ctx.stroke()}
    if(t.nick){ctx.textAlign='center';ctx.font='12px Arial';ctx.fillStyle='#e5e7eb';ctx.fillText(t.nick,t.x+c,t.y-12)}
  }
    function draw(ctx,state){if(!state)return;ctx.fillStyle='#020617';ctx.fillRect(0,0,672,672);ctx.strokeStyle='rgba(148,163,184,.06)';for(let i=0;i<=21;i++){ctx.beginPath();ctx.moveTo(i*32,0);ctx.lineTo(i*32,672);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*32);ctx.lineTo(672,i*32);ctx.stroke()}for(let r=0;r<21;r++)for(let c=0;c<21;c++)if(state.map[r][c]!==GRASS)drawTile(ctx,c,r,state.map[r][c]);(state.powerUps||[]).forEach(u=>{
    const cx=u.x+13, cy=u.y+13, pulse=1.5*Math.sin(Date.now()/120);
    const colors={life:'#ef4444',speed:'#facc15',double:'#f97316',shield:'#60a5fa',bomb:'#111827',freeze:'#93c5fd',repair:'#22c55e',laser:'#fb7185',coin:'#fbbf24',wall:'#b45309',ghost:'#a78bfa',magnet:'#38bdf8',drone:'#84cc16',heartRain:'#f9a8d4',rapid:'#f97316',nuke:'#bef264',star:'#fde68a',barrier:'#c084fc'};
    ctx.save();
    ctx.shadowColor=colors[u.type]||'#fff';
    ctx.shadowBlur=12;
    ctx.fillStyle=colors[u.type]||'rgba(255,255,255,.25)';
    ctx.beginPath();
    ctx.roundRect(u.x-4-pulse,u.y-4-pulse,34+pulse*2,34+pulse*2,9);
    ctx.fill();
    ctx.shadowBlur=0;
    ctx.lineWidth=2;
    ctx.strokeStyle='#ffffff';
    ctx.stroke();
    ctx.fillStyle='rgba(2,6,23,.72)';
    ctx.beginPath();
    ctx.roundRect(u.x+1,u.y+1,24,24,7);
    ctx.fill();
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.font='23px Arial';
    ctx.fillText(POWER_ICON[u.type]||'?',cx,cy+1);
    ctx.font='bold 9px Arial';
    ctx.fillStyle='#fff';
    ctx.strokeStyle='rgba(0,0,0,.75)';
    ctx.lineWidth=3;
    const label=(POWER_NAME[u.type]||'道具').slice(0,4);
    ctx.strokeText(label,cx,u.y+42);
    ctx.fillText(label,cx,u.y+42);
    ctx.restore();
  });(state.players||[]).filter(p=>p.alive!==false).forEach(p=>drawTank(ctx,{...p,shield:p.buffs?.shield>0}));(state.enemies||[]).forEach(e=>drawTank(ctx,{...e,owner:'enemy'}));(state.bullets||[]).forEach(b=>{ctx.fillStyle=b.laser?'#fb7185':(b.owner==='player'?'#facc15':'#f87171');ctx.fillRect(b.x,b.y,b.size,b.size)});for(let r=0;r<21;r++)for(let c=0;c<21;c++)if(state.map[r][c]===GRASS)drawTile(ctx,c,r,GRASS);(state.effects||[]).forEach(e=>{ctx.globalAlpha=Math.max(0,e.life/35);if(e.type==='text'){ctx.font='bold 16px Arial';ctx.fillStyle='#fde68a';ctx.textAlign='center';ctx.fillText(e.text,e.x+15,e.y)}else{ctx.fillStyle=e.type==='spark'?'#e5e7eb':'#f97316';ctx.fillRect(e.x-5,e.y-5,10,10)}ctx.globalAlpha=1});if(['win','gameover','pause'].includes(state.state)){ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(0,0,672,672);ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='bold 42px Arial';ctx.fillText(state.state==='win'?'胜利！':state.state==='pause'?'暂停':'游戏结束',336,280);ctx.font='22px Arial';ctx.fillText(state.message||'回大厅可重新开局',336,330)}}
  return {draw,drawTile,drawTank};
})();
