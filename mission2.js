// Misión 2 — El viaje del agua
// Extiende la base sin modificar el flujo de las demás misiones.

const stemValves = [
  { x: 610, y: 535, active: false, name: 'Compuerta inferior' },
  { x: 675, y: 468, active: false, name: 'Compuerta superior' }
];

missions[2].objective = 'Activa 2 compuertas y lleva el agua hasta la hoja.';

const baseResetGame = resetGame;
resetGame = function () {
  stemValves.forEach(v => v.active = false);
  missions[2].objective = 'Activa 2 compuertas y lleva el agua hasta la hoja.';
  baseResetGame();
};

const baseCanMoveTo = canMoveTo;
canMoveTo = function (nx, ny) {
  if (!baseCanMoveTo(nx, ny)) return false;

  if (state.mission === 2) {
    // Primera compuerta: impide seguir subiendo hasta activarla.
    if (!stemValves[0].active && player.y > 520 && ny < 520 && nx > 570 && nx < 710) {
      return false;
    }

    // Segunda compuerta: mantiene cerrada la entrada a la hoja.
    if (stemValves[0].active && !stemValves[1].active && player.y > 450 && ny < 450 && nx > 570 && nx < 710) {
      return false;
    }
  }

  return true;
};

const baseUpdateInteractions = updateInteractions;
updateInteractions = function (dt, elapsed) {
  baseUpdateInteractions(dt, elapsed);

  if (state.mission !== 2) return;

  const nextValve = stemValves.findIndex(v => !v.active);
  if (nextValve === -1) return;

  const valve = stemValves[nextValve];
  if (dist(player, valve) < 54) {
    interaction.textContent = `E — Abrir ${valve.name.toLowerCase()}`;
    interaction.classList.remove('hidden');
    interaction.dataset.action = `stemValve:${nextValve}`;
  }
};

const baseActivateInteraction = activateInteraction;
activateInteraction = function () {
  const action = interaction.dataset.action || '';

  if (state.mission === 2 && action.startsWith('stemValve:')) {
    const index = Number(action.split(':')[1]);
    const valve = stemValves[index];
    if (!valve || valve.active) return;

    // Obliga a completar las compuertas en orden para que la misión sea clara.
    if (index === 1 && !stemValves[0].active) {
      showDialogue('Primero debemos abrir la compuerta inferior para que el agua pueda subir.', 2800);
      return;
    }

    valve.active = true;
    hintTimer = 0;

    if (index === 0) {
      missions[2].objective = 'Abre la compuerta superior y continúa hacia la hoja.';
      updateHud();
      showBanner('💧 COMPUERTA 1/2 ACTIVADA', 1500);
      showDialogue('Bien. El agua puede seguir subiendo por el tallo.', 2800);
    } else {
      missions[2].objective = 'Sigue el conducto hasta llegar a la hoja.';
      updateHud();
      showBanner('💧 COMPUERTAS 2/2 ACTIVADAS', 1600);
      showDialogue('¡Listo! El camino está abierto. Sigamos el agua hasta la hoja.', 3000);
    }

    interaction.classList.add('hidden');
    interaction.dataset.action = '';
    return;
  }

  baseActivateInteraction();
};

const baseDrawObjects = drawObjects;
drawObjects = function (t) {
  baseDrawObjects(t);

  if (state.mission < 2) return;

  stemValves.forEach((valve, index) => {
    const enabled = valve.active;

    ctx.save();
    ctx.translate(valve.x, valve.y);

    ctx.shadowBlur = enabled ? 18 : 5;
    ctx.shadowColor = enabled ? '#72ddff' : '#111';
    ctx.fillStyle = enabled ? '#4fc9e8' : '#875e3d';
    ctx.strokeStyle = enabled ? '#d7f8ff' : '#c99a6a';
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.rotate(enabled ? t * 1.5 : 0);
    ctx.strokeStyle = enabled ? '#ffffff' : '#ead3b0';
    ctx.lineWidth = 5;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
      ctx.lineTo(Math.cos(a) * 23, Math.sin(a) * 23);
      ctx.stroke();
    }

    ctx.restore();

    if (state.mission === 2 && !enabled) {
      ctx.save();
      ctx.font = '800 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(239,255,242,.92)';
      ctx.fillText(index === 0 ? 'COMPUERTA 1' : 'COMPUERTA 2', valve.x, valve.y - 32);
      ctx.restore();
    }
  });

  if (state.mission === 2) {
    // Flechas de dirección dentro del tallo para que el visitante de feria no se pierda.
    ctx.save();
    ctx.fillStyle = 'rgba(211, 255, 172, .7)';
    ctx.font = '900 20px system-ui';
    ctx.textAlign = 'center';
    [585, 510, 438].forEach((y, i) => {
      if (i === 0 || stemValves[i - 1]?.active) ctx.fillText('↑', 640, y);
    });
    ctx.restore();
  }
};
