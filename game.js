const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const endScreen = document.getElementById('end-screen');
const playBtn = document.getElementById('play-btn');
const replayBtn = document.getElementById('replay-btn');
const hud = document.getElementById('hud');
const dialogue = document.getElementById('dialogue');
const dialogueText = document.getElementById('dialogue-text');
const missionTitle = document.getElementById('mission-title');
const missionObjective = document.getElementById('mission-objective');
const waterHud = document.getElementById('water-hud');
const co2Hud = document.getElementById('co2-hud');
const lightHud = document.getElementById('light-hud');
const interaction = document.getElementById('interaction');
const banner = document.getElementById('banner');
const timerCard = document.getElementById('timer-card');
const timerEl = document.getElementById('timer');
const touchControls = document.getElementById('touch-controls');
const touchAction = document.getElementById('touch-action');

const W = canvas.width;
const H = canvas.height;
const keys = new Set();
let gameStarted = false;
let lastTime = 0;
let dialogueTimer = null;
let hintTimer = 0;

const missions = {
  1: { title: 'El agua perdida', objective: 'Encuentra 3 gotas de agua.' },
  2: { title: 'El viaje del agua', objective: 'Sube por el tallo hasta la hoja.' },
  3: { title: 'Aire para la planta', objective: 'Recolecta 3 moléculas de CO₂.' },
  4: { title: 'Energía del Sol', objective: 'Activa 3 receptores de luz.' },
  5: { title: 'Encender el cloroplasto', objective: 'Regresa al centro y activa la fotosíntesis.' },
  6: { title: 'La Gran Sombra', objective: 'Reactiva los 3 receptores antes de que termine el tiempo.' }
};

const state = {
  mission: 1,
  water: 0,
  co2: 0,
  light: 0,
  finalLight: 0,
  timer: 30,
  timerRunning: false,
  photosynthesisOn: false,
  shadow: false,
  finished: false
};

const player = {
  x: 640,
  y: 630,
  r: 17,
  speed: 190,
  facing: 'up'
};

const waterDrops = [
  { x: 520, y: 620, active: true },
  { x: 710, y: 650, active: true },
  { x: 610, y: 560, active: true }
];

const co2Molecules = [
  { x: 315, y: 280, type: 'CO2', active: true, phase: 0.3 },
  { x: 390, y: 330, type: 'O2', active: true, phase: 1.5 },
  { x: 260, y: 350, type: 'CO2', active: true, phase: 2.2 },
  { x: 420, y: 240, type: 'N2', active: true, phase: 0.8 },
  { x: 335, y: 205, type: 'CO2', active: true, phase: 2.9 },
  { x: 455, y: 355, type: 'O2', active: true, phase: 1.1 }
];

const receptors = [
  { x: 845, y: 180, active: false },
  { x: 980, y: 235, active: false },
  { x: 1085, y: 155, active: false }
];

const chloroplast = { x: 660, y: 275, r: 78 };
const gate = { x: 640, y: 480, open: false };

function resetGame() {
  Object.assign(state, {
    mission: 1,
    water: 0,
    co2: 0,
    light: 0,
    finalLight: 0,
    timer: 30,
    timerRunning: false,
    photosynthesisOn: false,
    shadow: false,
    finished: false
  });
  player.x = 640;
  player.y = 630;
  waterDrops.forEach(d => d.active = true);
  co2Molecules.forEach(m => m.active = true);
  receptors.forEach(r => r.active = false);
  gate.open = false;
  updateHud();
  showMissionBanner();
  showDialogue('Algo no está bien. Esta planta está perdiendo energía.', 3400);
  setTimeout(() => showDialogue('Estamos en la raíz. Desde aquí la planta obtiene agua del suelo.', 3600), 3600);
  hintTimer = 0;
}

function startGame() {
  startScreen.classList.add('hidden');
  endScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  if (matchMedia('(pointer: coarse)').matches || window.innerWidth < 800) {
    touchControls.classList.remove('hidden');
  }
  gameStarted = true;
  resetGame();
}

function showDialogue(text, duration = 2800) {
  dialogueText.textContent = text;
  dialogue.classList.remove('hidden');
  clearTimeout(dialogueTimer);
  dialogueTimer = setTimeout(() => dialogue.classList.add('hidden'), duration);
}

function showBanner(text, duration = 1700) {
  banner.textContent = text;
  banner.classList.remove('hidden');
  setTimeout(() => banner.classList.add('hidden'), duration);
}

function showMissionBanner() {
  const m = missions[state.mission];
  if (!m) return;
  showBanner(`NUEVA MISIÓN · ${m.title.toUpperCase()}`, 1800);
}

function setMission(next) {
  state.mission = next;
  hintTimer = 0;
  updateHud();
  if (missions[next]) showMissionBanner();
}

function updateHud() {
  const m = missions[state.mission];
  if (m) {
    missionTitle.textContent = m.title;
    missionObjective.textContent = m.objective;
  }
  waterHud.textContent = `💧 ${state.water}/3${state.water === 3 ? ' ✓' : ''}`;
  co2Hud.textContent = `CO₂ ${state.co2}/3${state.co2 === 3 ? ' ✓' : ''}`;
  const shownLight = state.mission === 6 ? state.finalLight : state.light;
  lightHud.textContent = `☀️ ${shownLight}/3${shownLight === 3 ? ' ✓' : ''}`;
  timerCard.classList.toggle('hidden', state.mission !== 6);
  timerEl.textContent = Math.ceil(state.timer);
}

function completeMission(message) {
  showBanner('✓ MISIÓN COMPLETADA', 1500);
  if (message) showDialogue(message, 3200);
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function canMoveTo(nx, ny) {
  const r = player.r;
  if (nx - r < 55 || nx + r > W - 55 || ny - r < 55 || ny + r > H - 45) return false;

  // Barrera entre raíz y tallo hasta completar agua.
  if (!gate.open && player.y > 490 && ny < 490 && nx > 555 && nx < 725) return false;

  // Bordes simplificados de la gran hoja.
  if (ny < 445) {
    const dx = (nx - 690) / 560;
    const dy = (ny - 285) / 240;
    if (dx * dx + dy * dy > 1.03) return false;
  }

  return true;
}

function updatePlayer(dt) {
  let dx = 0;
  let dy = 0;
  if (keys.has('ArrowLeft') || keys.has('a')) dx--;
  if (keys.has('ArrowRight') || keys.has('d')) dx++;
  if (keys.has('ArrowUp') || keys.has('w')) dy--;
  if (keys.has('ArrowDown') || keys.has('s')) dy++;
  if (!dx && !dy) return;
  const mag = Math.hypot(dx, dy);
  dx /= mag;
  dy /= mag;
  const nx = player.x + dx * player.speed * dt;
  const ny = player.y + dy * player.speed * dt;
  if (canMoveTo(nx, player.y)) player.x = nx;
  if (canMoveTo(player.x, ny)) player.y = ny;
  if (Math.abs(dx) > Math.abs(dy)) player.facing = dx > 0 ? 'right' : 'left';
  else player.facing = dy > 0 ? 'down' : 'up';
}

function updateInteractions(dt, elapsed) {
  interaction.classList.add('hidden');

  if (state.mission === 1) {
    waterDrops.forEach((drop, i) => {
      if (drop.active && dist(player, drop) < 34) {
        drop.active = false;
        state.water++;
        updateHud();
        if (state.water === 1) showDialogue('¡Agua! Este es uno de los recursos que necesitamos.');
        if (state.water === 3) {
          gate.open = true;
          completeMission('Las raíces absorbieron el agua. Ahora debemos llevarla hasta la hoja.');
          setTimeout(() => setMission(2), 1700);
        }
      }
    });
  }

  if (state.mission === 2 && player.y < 450) {
    completeMission('¡Llegamos! El agua ya está disponible en la hoja.');
    setTimeout(() => {
      setMission(3);
      showDialogue('Estas pequeñas aberturas se llaman estomas. Por aquí la planta intercambia gases con el ambiente.', 3900);
    }, 1700);
  }

  if (state.mission === 3) {
    co2Molecules.forEach(m => {
      if (!m.active) return;
      const bob = Math.sin(elapsed * 2 + m.phase) * 8;
      const pseudo = { x: m.x, y: m.y + bob };
      if (dist(player, pseudo) < 34) {
        m.active = false;
        if (m.type === 'CO2') {
          state.co2++;
          if (state.co2 === 1) showDialogue('¡Eso es! El CO₂ viene del aire.');
          if (state.co2 === 3) {
            completeMission('Perfecto. Ya tenemos agua y dióxido de carbono.');
            setTimeout(() => setMission(4), 1700);
          }
        } else {
          showDialogue('Esa no es la que necesitamos. Busquemos CO₂.', 2200);
        }
        updateHud();
      }
    });
  }

  if (state.mission === 4 || state.mission === 6) {
    receptors.forEach((r, index) => {
      if (dist(player, r) < 56 && !r.active) {
        interaction.textContent = 'E — Activar receptor';
        interaction.classList.remove('hidden');
        interaction.dataset.action = `receptor:${index}`;
      }
    });
  }

  if (state.mission === 5 && dist(player, chloroplast) < 115) {
    interaction.textContent = 'E — Activar fotosíntesis';
    interaction.classList.remove('hidden');
    interaction.dataset.action = 'chloroplast';
  }

  if (state.mission === 6 && state.timerRunning) {
    state.timer -= dt;
    if (state.timer <= 0) {
      state.timer = 30;
      receptors.forEach(r => r.active = false);
      state.finalLight = 0;
      showDialogue('Intentémoslo otra vez. La luz es necesaria para mantener la fotosíntesis.', 3300);
    }
    updateHud();
  }

  hintTimer += dt;
  if (hintTimer > 12) {
    hintTimer = 0;
    const hints = {
      1: 'Busca agua cerca de las raíces.',
      2: 'Tenemos que seguir subiendo hacia la hoja.',
      3: 'Busca las moléculas marcadas como CO₂.',
      4: 'Los receptores están en la parte superior de la hoja.',
      5: 'Regresemos al centro de la hoja.',
      6: 'Activa los tres receptores solares lo antes posible.'
    };
    if (hints[state.mission]) showDialogue(hints[state.mission], 2500);
  }
}

function activateInteraction() {
  if (interaction.classList.contains('hidden')) return;
  const action = interaction.dataset.action || '';

  if (action.startsWith('receptor:')) {
    const index = Number(action.split(':')[1]);
    const r = receptors[index];
    if (!r || r.active) return;
    r.active = true;
    if (state.mission === 4) {
      state.light++;
      if (state.light === 1) showDialogue('¡Luz solar! Eso era lo que faltaba.');
      if (state.light === 2) showDialogue('La energía está llegando al cloroplasto.');
      if (state.light === 3) {
        completeMission('¡Listo! Ya tenemos los tres recursos.');
        setTimeout(() => setMission(5), 1700);
      }
    } else if (state.mission === 6) {
      state.finalLight++;
      if (state.finalLight === 1) showDialogue('Uno listo. La luz está regresando.');
      if (state.finalLight === 2) showDialogue('Ya casi lo tenemos.');
      if (state.finalLight === 3) finishShadowMission();
    }
    updateHud();
  }

  if (action === 'chloroplast' && state.mission === 5) {
    state.photosynthesisOn = true;
    showBanner('🌿 FOTOSÍNTESIS ACTIVADA ✓', 2200);
    showDialogue('¡Funcionó! La planta está produciendo glucosa y liberando oxígeno al ambiente.', 4200);
    setTimeout(startShadowMission, 4300);
  }
}

function startShadowMission() {
  state.shadow = true;
  state.photosynthesisOn = false;
  state.finalLight = 0;
  state.timer = 30;
  state.timerRunning = true;
  receptors.forEach(r => r.active = false);
  setMission(6);
  showBanner('⚠ LUZ INSUFICIENTE', 1800);
  showDialogue('¡La luz está disminuyendo! Sin suficiente luz, la fotosíntesis también disminuye.', 3700);
}

function finishShadowMission() {
  state.timerRunning = false;
  state.shadow = false;
  state.photosynthesisOn = true;
  updateHud();
  completeMission('¡Lo conseguimos! El cloroplasto está funcionando nuevamente.');
  setTimeout(finishGame, 3200);
}

function finishGame() {
  state.finished = true;
  gameStarted = false;
  hud.classList.add('hidden');
  dialogue.classList.add('hidden');
  interaction.classList.add('hidden');
  touchControls.classList.add('hidden');
  endScreen.classList.remove('hidden');
}

function drawBackground(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, state.shadow ? '#183824' : '#245d31');
  g.addColorStop(.62, '#183f24');
  g.addColorStop(.64, '#6a452c');
  g.addColorStop(1, '#3d281e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Gran hoja.
  ctx.save();
  ctx.translate(690, 285);
  ctx.scale(1.2, .78);
  const leafGrad = ctx.createRadialGradient(-120, -70, 20, 0, 0, 470);
  leafGrad.addColorStop(0, state.shadow ? '#386f3c' : '#67b943');
  leafGrad.addColorStop(1, state.shadow ? '#174925' : '#235f2f');
  ctx.fillStyle = leafGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 470, 235, -.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(190,255,154,.35)';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();

  // Venas de la hoja.
  ctx.strokeStyle = state.shadow ? 'rgba(104,159,99,.45)' : 'rgba(172,232,111,.55)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(640, 460); ctx.lineTo(690, 285); ctx.lineTo(1110, 210);
  ctx.moveTo(690, 285); ctx.lineTo(350, 225);
  ctx.moveTo(705, 305); ctx.lineTo(900, 370);
  ctx.moveTo(650, 310); ctx.lineTo(470, 385);
  ctx.stroke();

  // Tallo.
  const stemGrad = ctx.createLinearGradient(560, 430, 720, 430);
  stemGrad.addColorStop(0, '#2f7334');
  stemGrad.addColorStop(.5, '#58a542');
  stemGrad.addColorStop(1, '#276431');
  ctx.fillStyle = stemGrad;
  roundRect(570, 405, 140, 210, 54, true, false);
  ctx.strokeStyle = 'rgba(193,255,157,.25)';
  ctx.lineWidth = 5;
  for (let x = 595; x <= 685; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 420);
    ctx.lineTo(x - 10, 605);
    ctx.stroke();
  }

  // Raíz principal y ramificaciones.
  ctx.strokeStyle = '#9b6b42';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  const roots = [
    [640, 595, 520, 685], [640, 595, 735, 690], [625, 610, 600, 710],
    [670, 610, 850, 680], [600, 620, 430, 660], [695, 620, 785, 715]
  ];
  roots.forEach(([x1,y1,x2,y2]) => { ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); });

  // Estomas.
  drawStoma(285, 275); drawStoma(365, 300);

  // Luz solar.
  if (!state.shadow) {
    const sunG = ctx.createRadialGradient(1040, 75, 10, 1040, 75, 180);
    sunG.addColorStop(0, 'rgba(255,240,98,.8)');
    sunG.addColorStop(1, 'rgba(255,231,86,0)');
    ctx.fillStyle = sunG;
    ctx.fillRect(820, 0, 450, 310);
  } else {
    drawCloud(995, 70, 1.15);
  }

  // Agua animada ascendiendo por el tallo tras misión 1.
  if (state.water === 3) {
    for (let i = 0; i < 4; i++) {
      const y = 560 - ((t * 65 + i * 55) % 155);
      drawDrop(625 + (i % 2) * 34, y, 9, .8);
    }
  }
}

function drawStoma(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#6dc067';
  ctx.beginPath(); ctx.ellipse(-16, 0, 17, 38, -.18, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(16, 0, 17, 38, .18, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#123a25';
  ctx.beginPath(); ctx.ellipse(0, 0, 9, 29, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawCloud(x, y, scale=1) {
  ctx.save();
  ctx.translate(x,y); ctx.scale(scale,scale);
  ctx.fillStyle = 'rgba(68,79,79,.95)';
  [[0,0,55],[55,5,43],[-50,12,40],[10,-28,48]].forEach(([cx,cy,r])=>{ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();});
  ctx.restore();
}

function drawDrop(x, y, r=14, alpha=1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x,y);
  const g=ctx.createRadialGradient(-4,-6,2,0,0,r*1.4);g.addColorStop(0,'#d9fbff');g.addColorStop(.25,'#63d9ff');g.addColorStop(1,'#1688d8');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-r*1.4);ctx.bezierCurveTo(r,-r*.2,r,r,0,r*1.2);ctx.bezierCurveTo(-r,r,-r,-r*.2,0,-r*1.4);ctx.fill();
  ctx.restore();
}

function drawMolecule(x,y,type) {
  const color = type === 'CO2' ? '#52d66d' : type === 'O2' ? '#6ecfff' : '#b4bdd3';
  ctx.save(); ctx.translate(x,y);
  ctx.shadowBlur=14;ctx.shadowColor=color;
  ctx.fillStyle=color; ctx.beginPath(); ctx.arc(0,0,19,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle='#0d2520';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(type==='CO2'?'CO₂':type,0,1);
  ctx.restore();
}

function drawReceptor(r) {
  ctx.save();ctx.translate(r.x,r.y);
  ctx.shadowBlur=r.active?24:0;ctx.shadowColor='#ffe858';
  ctx.fillStyle=r.active?'#ffe759':'#6d744c';ctx.beginPath();ctx.arc(0,0,24,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=r.active?'#fff5a3':'#aab58a';ctx.lineWidth=5;
  for(let a=0;a<Math.PI*2;a+=Math.PI/4){ctx.beginPath();ctx.moveTo(Math.cos(a)*30,Math.sin(a)*30);ctx.lineTo(Math.cos(a)*41,Math.sin(a)*41);ctx.stroke();}
  ctx.restore();
}

function drawChloroplast(t) {
  const readiness = state.light === 3 ? 3 : state.co2 === 3 ? 2 : state.water === 3 ? 1 : 0;
  ctx.save(); ctx.translate(chloroplast.x, chloroplast.y);
  ctx.shadowBlur = state.photosynthesisOn ? 40 : readiness * 8;
  ctx.shadowColor = state.photosynthesisOn ? '#cfff5d' : '#6dcf66';
  ctx.fillStyle = readiness === 0 ? '#274c2c' : readiness === 1 ? '#356e4b' : readiness === 2 ? '#41843f' : '#6aa93c';
  ctx.strokeStyle = '#a4d57a'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.ellipse(0,0,86,58,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  for(let y=-28;y<=28;y+=19){
    ctx.fillStyle = state.photosynthesisOn ? '#b6e946' : '#4e8037';
    for(let x=-42;x<=42;x+=28){ctx.beginPath();ctx.ellipse(x,y,18,7,0,0,Math.PI*2);ctx.fill();}
  }
  if(state.photosynthesisOn){
    for(let i=0;i<8;i++){
      const a=t*1.3+i*Math.PI/4;const rr=100+Math.sin(t*2+i)*8;
      ctx.fillStyle=i%2?'#9ee9ff':'#e9ff8b';ctx.beginPath();ctx.arc(Math.cos(a)*rr,Math.sin(a)*rr*.55,4,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.restore();
}

function drawRoselia() {
  ctx.save(); ctx.translate(player.x, player.y);
  // sombra
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(0,17,20,8,0,0,Math.PI*2);ctx.fill();
  // cuerpo
  ctx.fillStyle='#f1e3ba';roundRect(-13,-5,26,31,9,true,false);
  ctx.fillStyle='#65b34a';ctx.beginPath();ctx.arc(0,-21,18,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#d7ff83';ctx.beginPath();ctx.arc(0,-18,13,0,Math.PI*2);ctx.fill();
  // hojas/cabello
  ctx.fillStyle='#3f8a3f';
  [[-13,-31,-.5],[0,-37,0],[13,-31,.5]].forEach(([x,y,a])=>{ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,0,8,16,0,0,Math.PI*2);ctx.fill();ctx.restore();});
  // ojos
  ctx.fillStyle='#244125';ctx.beginPath();ctx.arc(-5,-18,2.3,0,Math.PI*2);ctx.arc(5,-18,2.3,0,Math.PI*2);ctx.fill();
  // mochila
  ctx.fillStyle='#7a5832';roundRect(-21,2,10,22,5,true,false);
  ctx.restore();
}

function roundRect(x,y,w,h,r,fill,stroke){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill)ctx.fill();if(stroke)ctx.stroke();
}

function drawObjects(t) {
  waterDrops.forEach(d => { if(d.active) drawDrop(d.x, d.y + Math.sin(t*3+d.x)*5, 14); });

  if (state.mission >= 3) {
    co2Molecules.forEach(m => {
      if(m.active) drawMolecule(m.x, m.y + Math.sin(t*2 + m.phase)*8, m.type);
    });
  }

  receptors.forEach(drawReceptor);
  drawChloroplast(t);

  if (!gate.open) {
    ctx.fillStyle='#704b2f';roundRect(555,468,170,24,12,true,false);
    ctx.fillStyle='#d0aa6f';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText('Recolecta el agua para avanzar',640,486);
  }
}

function render(time=0) {
  const t=time/1000;
  ctx.clearRect(0,0,W,H);
  drawBackground(t);
  drawObjects(t);
  drawRoselia();
  requestAnimationFrame(render);
}

function tick(time) {
  const dt=Math.min((time-lastTime)/1000 || 0, .035);
  lastTime=time;
  if(gameStarted){updatePlayer(dt);updateInteractions(dt,time/1000);}
  requestAnimationFrame(tick);
}

window.addEventListener('keydown', e => {
  const key=e.key.length===1?e.key.toLowerCase():e.key;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','e'].includes(key)) e.preventDefault();
  keys.add(key);
  if(key==='e') activateInteraction();
});
window.addEventListener('keyup', e => keys.delete(e.key.length===1?e.key.toLowerCase():e.key));

[...document.querySelectorAll('[data-key]')].forEach(btn=>{
  const key=btn.dataset.key;
  const down=e=>{e.preventDefault();keys.add(key);};
  const up=e=>{e.preventDefault();keys.delete(key);};
  btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('pointerleave',up);
});
touchAction.addEventListener('pointerdown', e=>{e.preventDefault();activateInteraction();});
playBtn.addEventListener('click', startGame);
replayBtn.addEventListener('click', startGame);

requestAnimationFrame(render);
requestAnimationFrame(tick);
