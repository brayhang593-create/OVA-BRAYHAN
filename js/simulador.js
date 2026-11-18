(() => {
  const form = document.querySelector('#sim-form');
  const canvas = document.querySelector('#sim-chart');
  const table = document.querySelector('#sim-data');
  const summary = document.querySelector('#sim-summary');
  let series;

  function simulate() {
    const data = new FormData(form);
    const rate = Number(data.get('rate'));
    const steps = Number(data.get('steps'));
    const a = logistic(rate, Number(data.get('startA')), steps);
    const b = logistic(rate, Number(data.get('startB')), steps);
    series = [a, b];
    drawTrajectory(canvas, series);

    const distances = a.map((value, index) => Math.abs(value - b[index]));
    const peak = Math.max(...distances);
    summary.textContent = 'Separación inicial: ' + decimal.format(distances[0]) +
      ' · Mayor separación: ' + decimal.format(peak) +
      ' (paso ' + distances.indexOf(peak) + ') · Separación final: ' + decimal.format(distances[steps]) + '.';

    const rows = a.map((value, step) => {
      const row = document.createElement('tr');
      [step, decimal.format(value), decimal.format(b[step])].forEach((entry) => {
        row.insertCell().textContent = entry;
      });
      return row;
    });
    table.replaceChildren(...rows);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    simulate();
  });
  form.querySelectorAll('[data-r]').forEach((button) => {
    button.addEventListener('click', () => {
      form.reset();
      form.elements.rate.value = button.dataset.r;
      simulate();
    });
  });
  new ResizeObserver(() => drawTrajectory(canvas, series)).observe(canvas);
  simulate();

  document.querySelectorAll('[data-exercise]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelector('#exercise-feedback').textContent = button.dataset.exercise === 'yes'
        ? 'Correcto. En este ejemplo las curvas empiezan muy juntas y luego se separan. Compara la separación inicial con la mayor separación.'
        : 'Prueba el ejemplo «Caótico» y compara la separación inicial con la mayor separación. La distancia entre las trayectorias cambia.';
    });
  });
})();
