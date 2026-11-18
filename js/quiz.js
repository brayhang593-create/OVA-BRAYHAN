(() => {
  const questions = [
    {
      title: '¿Qué significa que el mapa logístico sea determinista?',
      options: ['Cualquier valor inicial lleva al mismo resultado.', 'La misma regla y el mismo estado dan el mismo siguiente valor.', 'Cada paso se elige al azar.'],
      correct: 1,
      explanation: 'La regla determina el siguiente estado a partir del actual.'
    },
    {
      title: '¿Qué se cambia para comparar sensibilidad a condiciones iniciales?',
      options: ['Solo los estados iniciales; se mantiene r.', 'Solo el número de iteraciones.', 'Los estados iniciales y r al mismo tiempo.'],
      correct: 0,
      explanation: 'Con r fijo, ambas trayectorias siguen la misma regla.'
    },
    {
      title: '¿Cuánto vale x₁ cuando r = 3 y x₀ = 0,2?',
      options: ['0,20', '0,60', '0,48'],
      correct: 2,
      explanation: 'El primer paso es 3 × 0,2 × (1 − 0,2) = 0,48.'
    },
    {
      title: '¿Cómo se reconoce una trayectoria de período dos?',
      options: ['Sus valores se acercan a cero.', 'Alterna entre dos valores después del transitorio.', 'Cada valor supera al anterior.'],
      correct: 1,
      explanation: 'La alternancia se repite cada dos pasos.'
    },
    {
      title: '¿Por qué se dificulta predecir una trayectoria caótica a largo plazo?',
      options: ['Porque un pequeño error inicial puede amplificarse.', 'Porque la ecuación cambia de forma en cada paso.', 'Porque siempre se detiene después de pocas iteraciones.'],
      correct: 0,
      explanation: 'La incertidumbre inicial puede crecer al avanzar las iteraciones.'
    }
  ];
  const form = document.querySelector('#quiz-form');
  const results = document.querySelector('#quiz-result');
  const explanations = [];

  for (const [index, question] of questions.entries()) {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = (index + 1) + '. ' + question.title;
    fieldset.append(legend);
    question.options.forEach((option, value) => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'q' + index;
      radio.value = value;
      radio.required = true;
      label.append(radio, document.createTextNode(option));
      fieldset.append(label);
    });
    const explanation = document.createElement('p');
    explanation.className = 'feedback';
    explanations.push(explanation);
    fieldset.append(explanation);
    document.querySelector('#quiz-questions').append(fieldset);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const answers = new FormData(form);
    let score = 0;
    questions.forEach((question, index) => {
      const correct = Number(answers.get('q' + index)) === question.correct;
      if (correct) score += 1;
      explanations[index].textContent = (correct ? 'Correcta. ' : 'Respuesta correcta: ' + question.options[question.correct] + ' ') + question.explanation;
    });
    results.textContent = 'Puntaje: ' + score + ' de ' + questions.length + ' (' + (score * 20) + ' %).';
  });
  form.addEventListener('reset', () => {
    results.textContent = '';
    explanations.forEach((explanation) => { explanation.textContent = ''; });
  });
})();
