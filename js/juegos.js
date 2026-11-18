(() => {
  const challenges = [
    { rate: 3.2, kind: 'periódico', clue: 'Dos niveles se alternan después del transitorio.' },
    { rate: 3.9, kind: 'caótico', clue: 'En este ejemplo de régimen caótico, los valores no forman un ciclo corto.' },
    { rate: 2.8, kind: 'estable', clue: 'Los valores se mantienen cerca de un punto fijo, 0,643.' }
  ];
  const canvas = document.querySelector('#game-chart');
  const count = document.querySelector('#trajectory-count');
  const data = document.querySelector('#trajectory-data');
  const feedback = document.querySelector('#trajectory-feedback');
  const next = document.querySelector('#trajectory-next');
  const play = document.querySelector('#trajectory-play');
  const reveal = document.querySelector('#trajectory-reveal');
  const cursor = document.querySelector('#trajectory-point');
  const reading = document.querySelector('#trajectory-reading');
  const answers = [...document.querySelectorAll('[data-kind]')];
  const startStep = 50;
  const sampleSize = 25;
  let round = 0;
  let correct = 0;
  let values;
  let shown;
  let timer = null;
  let attempts;

  function drawEvidence() {
    const index = cursor.valueAsNumber - startStep;
    drawTrajectory(canvas, [values.slice(0, shown)], startStep, index);
    reading.value = 'Paso ' + (startStep + index) + ' · x = ' + decimal.format(values[index]);
  }

  function stopPlayback() {
    window.clearInterval(timer);
    timer = null;
    play.textContent = 'Reproducir muestra';
  }

  function showSamples(amount) {
    shown = amount;
    cursor.max = startStep + shown - 1;
    cursor.value = cursor.max;
    reveal.disabled = shown === sampleSize;
    if (shown === sampleSize) stopPlayback();
    play.disabled = shown === sampleSize;
    reveal.textContent = reveal.disabled ? 'Muestra completa' : 'Revelar 6 puntos';
    data.textContent = values.slice(0, shown).map((value, index) => (startStep + index) + ': ' + decimal.format(value)).join(' · ');
    drawEvidence();
  }

  function renderRound() {
    stopPlayback();
    attempts = 0;
    values = logistic(challenges[round].rate, 0.25, startStep + sampleSize - 1).slice(startStep);
    count.textContent = 'Ronda ' + (round + 1) + ' de ' + challenges.length + ' · Aciertos: ' + correct;
    feedback.textContent = '';
    next.disabled = true;
    next.textContent = round === challenges.length - 1 ? 'Volver a jugar' : 'Siguiente trayectoria';
    answers.forEach((button) => { button.disabled = false; });
    showSamples(7);
  }

  cursor.addEventListener('input', drawEvidence);
  play.addEventListener('click', () => {
    if (timer !== null) {
      stopPlayback();
      return;
    }
    play.textContent = 'Pausar muestra';
    timer = window.setInterval(() => {
      showSamples(shown + 1);
      if (shown === sampleSize && document.activeElement === play) cursor.focus();
    }, 125);
  });
  reveal.addEventListener('click', () => {
    showSamples(Math.min(sampleSize, shown + 6));
    if (reveal.disabled) cursor.focus();
  });

  answers.forEach((button) => {
    button.addEventListener('click', () => {
      const challenge = challenges[round];
      const isCorrect = button.dataset.kind === challenge.kind;
      attempts += 1;
      if (!isCorrect && attempts === 1) {
        button.disabled = true;
        showSamples(Math.min(sampleSize, shown + 6));
        feedback.textContent = 'Inténtalo otra vez. Pista: ' + challenge.clue;
        answers.find((choice) => !choice.disabled).focus();
        return;
      }
      if (isCorrect) correct += 1;
      count.textContent = 'Ronda ' + (round + 1) + ' de ' + challenges.length + ' · Aciertos: ' + correct;
      feedback.textContent = (isCorrect ? 'Correcto. ' : 'La respuesta es «' + challenge.kind + '». ') + challenge.clue;
      if (round === challenges.length - 1) {
        feedback.textContent += ' Resultado final: ' + correct + ' de ' + challenges.length + '.';
      }
      showSamples(sampleSize);
      next.disabled = false;
      answers.forEach((choice) => { choice.disabled = true; });
      next.focus();
    });
  });

  next.addEventListener('click', () => {
    round = (round + 1) % challenges.length;
    if (round === 0) correct = 0;
    renderRound();
    reveal.focus();
  });
  renderRound();
  new ResizeObserver(drawEvidence).observe(canvas);
})();

(() => {
  const concepts = [
    ['Estado inicial', 'Valor desde el cual comienza una trayectoria.'],
    ['Determinismo', 'La misma regla y el mismo estado producen el mismo paso siguiente.'],
    ['Bifurcación', 'Cambio cualitativo de la dinámica al variar un parámetro.'],
    ['Sensibilidad inicial', 'Estados que empiezan muy cerca pueden seguir trayectorias muy separadas.']
  ];
  const board = document.querySelector('#memory-board');
  const stats = document.querySelector('#memory-stats');
  const feedback = document.querySelector('#memory-feedback');
  const actions = document.querySelector('#memory-actions');
  const retry = document.querySelector('#memory-continue');
  const reset = document.querySelector('#memory-reset');
  let first;
  let second;
  let moves;
  let pairs;

  function updateStats() {
    stats.textContent = 'Parejas: ' + pairs + ' de ' + concepts.length + ' · Intentos: ' + moves;
  }

  function setCard(card, state) {
    card.dataset.state = state;
    const covered = state === 'covered';
    const matched = state === 'matched';
    if (covered) {
      card.textContent = card.dataset.position;
    } else {
      const type = document.createElement('span');
      type.className = 'card-type';
      type.textContent = matched ? 'Pareja encontrada' : card.dataset.type;
      const face = document.createElement('span');
      face.className = 'card-face';
      face.textContent = card.dataset.label;
      card.replaceChildren(type, face);
    }
    card.setAttribute('aria-label', covered ? 'Voltear carta ' + card.dataset.position :
      card.dataset.type + ': ' + card.dataset.label + (matched ? ' · Pareja encontrada' : ''));
    card.setAttribute('aria-disabled', String(!covered));
    card.tabIndex = matched ? -1 : 0;
  }

  function flip(card) {
    if (card.dataset.state !== 'covered' || second) return;
    setCard(card, 'visible');
    if (!first) {
      first = card;
      feedback.textContent = 'Carta revelada: ' + card.dataset.label + ' Elige otra.';
      return;
    }
    second = card;
    moves += 1;
    if (first.dataset.pair === second.dataset.pair) {
      setCard(first, 'matched');
      setCard(second, 'matched');
      pairs += 1;
      feedback.textContent = 'Pareja encontrada: ' + concepts[Number(card.dataset.pair)][0] + '.';
      first = null;
      second = null;
      if (pairs === concepts.length) {
        feedback.textContent = '¡Tablero completo! Encontraste las cuatro parejas en ' + moves + ' intentos.';
        reset.focus();
      } else {
        board.querySelector('[data-state="covered"]').focus();
      }
    } else {
      feedback.textContent = 'Estas cartas pertenecen a parejas distintas. Lee ambas antes de volver a cubrirlas.';
      actions.hidden = false;
      board.querySelectorAll('[data-state="covered"]').forEach((covered) => {
        covered.setAttribute('aria-disabled', 'true');
        covered.tabIndex = -1;
      });
      retry.focus();
    }
    updateStats();
  }

  retry.addEventListener('click', () => {
    const returnTo = second;
    setCard(first, 'covered');
    setCard(second, 'covered');
    first = null;
    second = null;
    actions.hidden = true;
    board.querySelectorAll('[data-state="covered"]').forEach((covered) => {
      covered.setAttribute('aria-disabled', 'false');
      covered.tabIndex = 0;
    });
    feedback.textContent = 'Elige dos cartas para el siguiente intento.';
    returnTo.focus();
  });

  function restart() {
    first = null;
    second = null;
    moves = 0;
    pairs = 0;
    actions.hidden = true;
    feedback.textContent = '';
    const cards = concepts.flatMap((pair, index) => pair.map((label, side) => ({ label, pair: index, type: side === 0 ? 'Concepto' : 'Definición' })));
    for (let end = cards.length - 1; end > 0; end -= 1) {
      const swap = Math.floor(Math.random() * (end + 1));
      [cards[end], cards[swap]] = [cards[swap], cards[end]];
    }
    board.replaceChildren(...cards.map(({label, pair, type}, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'memory-card';
      card.dataset.label = label;
      card.dataset.pair = pair;
      card.dataset.type = type;
      card.dataset.position = index + 1;
      setCard(card, 'covered');
      card.addEventListener('click', () => flip(card));
      return card;
    }));
    updateStats();
  }

  reset.addEventListener('click', () => {
    restart();
    board.querySelector('button').focus();
  });
  restart();
})();
