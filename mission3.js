// Misión 3 — Aire para la planta
// El jugador debe abrir el estoma antes de poder recolectar CO₂.

let stomaOpened = false;
const stomaControl = { x: 365, y: 300 };

const mission3PreviousReset = resetGame;
resetGame = function () {
  stomaOpened = false;
  missions[3].objective = 'Abre el estoma y recolecta 3 moléculas de CO₂.';
  mission3PreviousReset();
};

const mission3PreviousUpdateInteractions = updateInteractions;
updateInteractions = function (dt, elapsed) {
  // Antes de abrir el estoma, bloqueamos la recolección de moléculas.
  if (state.mission === 3 && !stomaOpened) {
    interaction.classList.add('hidden');

    if (dist(player, stomaControl) < 78) {
      interaction.textContent = 'E — Abrir estoma';
      interaction.classList.remove('hidden');
      interaction.dataset.action = 'openStoma';
    }

    hintTimer += dt;
    if (hintTimer > 10) {
      hintTimer = 0;
      showDialogue('Acércate al estoma y ábrelo para permitir la entrada de gases.', 2800);
    }
    return;
  }

  mission3PreviousUpdateInteractions(dt, elapsed);
};

const mission3PreviousActivateInteraction = activateInteraction;
activateInteraction = function () {
  const action = interaction.dataset.action || '';

  if (state.mission === 3 && action === 'openStoma' && !stomaOpened) {
    stomaOpened = true;
    hintTimer = 0;
    missions[3].objective = 'Identifica y recolecta 3 moléculas de CO₂.';
    updateHud();
    showBanner('🍃 ESTOMA ABIERTO', 1500);
    showDialogue('Ahora los gases pueden entrar. Busca solo las moléculas de dióxido de carbono: CO₂.', 3600);
    interaction.classList.add('hidden');
    interaction.dataset.action = '';
    return;
  }

  mission3PreviousActivateInteraction();
};

const mission3PreviousDrawObjects = drawObjects;
drawObjects = function (t) {
  mission3PreviousDrawObjects(t);

  if (state.mission < 3) return;

  // Resalta el estoma correspondiente a la misión.
  ctx.save();
  ctx.translate(stomaControl.x, stomaControl.y);
  ctx.strokeStyle = stomaOpened ? 'rgba(121,255,166,.95)' : 'rgba(255,225,109,.95)';
  ctx.lineWidth = 4;
  ctx.shadowBlur = stomaOpened ? 18 : 10;
  ctx.shadowColor = stomaOpened ? '#79ffa6' : '#ffe16d';
  ctx.beginPath();
  ctx.ellipse(0, 0, stomaOpened ? 44 : 39, stomaOpened ? 61 : 55, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (state.mission === 3 && !stomaOpened) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,245,190,.94)';
    ctx.font = '900 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('ESTOMA CERRADO', stomaControl.x, stomaControl.y - 70);
    ctx.restore();
  }

  if (state.mission === 3 && stomaOpened) {
    // Flechas suaves que muestran la entrada del aire desde el exterior.
    ctx.save();
    ctx.strokeStyle = 'rgba(170, 244, 216, .65)';
    ctx.fillStyle = 'rgba(170, 244, 216, .8)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const y = 245 + i * 42;
      const pulse = (Math.sin(t * 3 + i) + 1) * 9;
      ctx.beginPath();
      ctx.moveTo(190 + pulse, y);
      ctx.lineTo(245 + pulse, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(245 + pulse, y);
      ctx.lineTo(235 + pulse, y - 6);
      ctx.lineTo(235 + pulse, y + 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
};
