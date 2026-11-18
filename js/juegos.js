(() => {
  const challenges = [
    { rate: 3.2, kind: 'periódico', clue: 'Los valores alternan entre dos niveles.' },
    { rate: 3.9, kind: 'caótico', clue: 'En este ejemplo las oscilaciones son irregulares y corresponden a un régimen caótico.' },
    { rate: 2.8, kind: 'estable', clue: 'Los valores se mantienen cerca de un mismo punto, 0,643.' }
  ];
  const canvas = document.querySelector('#game-chart');
  const count = document.querySelector('#trajectory-count');
  const data = document.querySelector('#trajectory-data');
  const feedback = document.querySelector('#trajectory-feedback');
  const next = document.querySelector('#trajectory-next');
  const answers = [...document.querySelectorAll('[data-kind]')];
  const startStep = 50;
  let round = 0;
  let correct = 0;
  let values;
  let answered = false;

  function renderRound() {
    values = logistic(challenges[round].rate, 0.25, 70).slice(startStep);
    answered = false;
    count.textContent = 'Trayectoria ' + (round + 1) + ' de ' + challenges.length;
    data.textContent = values.map((value, index) => (startStep + index) + ': ' + decimal.format(value)).join(' · ');
    feedback.textContent = '';
    next.disabled = true;
    next.textContent = round === challenges.length - 1 ? 'Volver a jugar' : 'Siguiente trayectoria';
    answers.forEach((button) => { button.disabled = false; });
    drawTrajectory(canvas, [values], startStep);
  }

  answers.forEach((button) => {
    button.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const challenge = challenges[round];
      const isCorrect = button.dataset.kind === challenge.kind;
      if (isCorrect) correct += 1;
      feedback.textContent = (isCorrect ? 'Correcto. ' : 'La respuesta es «' + challenge.kind + '». ') + challenge.clue;
      if (round === challenges.length - 1) {
        feedback.textContent += ' Aciertos: ' + correct + ' de ' + challenges.length + '.';
      }
      next.disabled = false;
    });
  });
  next.addEventListener('click', () => {
    round = (round + 1) % challenges.length;
    if (round === 0) correct = 0;
    renderRound();
    answers[0].focus();
  });
  renderRound();
  new ResizeObserver(() => drawTrajectory(canvas, [values], startStep)).observe(canvas);

  const concepts = [
    { label: 'Estado inicial', prompt: 'Valor desde el cual comienza una trayectoria.' },
    { label: 'Determinismo', prompt: 'Con la misma regla y el mismo estado se obtiene el mismo paso siguiente.' },
    { label: 'Bifurcación', prompt: 'Cambio cualitativo de la dinámica cuando se modifica un parámetro.' },
    { label: 'Sensibilidad inicial', prompt: 'Estados inicialmente cercanos pueden terminar con trayectorias muy separadas.' }
  ];
  const form = document.querySelector('#match-form');
  const matchFeedback = document.querySelector('#match-feedback');
  const fields = concepts.map((concept) => {
    const row = document.createElement('label');
    row.className = 'match-row';
    row.textContent = concept.prompt;
    const select = document.createElement('select');
    select.required = true;
    select.add(new Option('Selecciona un concepto', ''));
    [...concepts].sort((a, b) => a.label.localeCompare(b.label, 'es')).forEach((item) => {
      select.add(new Option(item.label, item.label));
    });
    row.append(select);
    return { row, select, concept };
  });
  document.querySelector('#matches').append(...fields.map((field) => field.row));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const errors = fields.flatMap(({ select, concept }, index) => {
      return select.value === concept.label ? [] : [(index + 1) + '. ' + concept.label];
    });
    matchFeedback.textContent = errors.length === 0
      ? '4 de 4. Todas las parejas son correctas.'
      : (fields.length - errors.length) + ' de 4. Revisa estas asociaciones: ' + errors.join(' · ');
  });
  form.addEventListener('reset', () => { matchFeedback.textContent = ''; });
})();
