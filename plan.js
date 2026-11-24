'use strict';
// Plano personalizado: rotina da semana, treinos e guias.
// Ao mudar a rotina sugerida, aumente PRESET_VERSION para o app oferecer a atualização.

const PRESET_VERSION = 2;
const WEEKDAYS = [1, 2, 3, 4, 5];

// [horário, período, título, dias]
const PRESET_ITEMS = [
  // Segunda a sexta
  ['06:00', 'manha', 'Acordar + 1 copo d’água', WEEKDAYS],
  ['06:10', 'manha', 'Café da manhã + creatina (5 g)', WEEKDAYS],
  ['06:35', 'manha', 'Café/pré-treino e sair pra levar a esposa (Santa Etelvina)', WEEKDAYS],
  ['07:45', 'manha', 'Treino na Live Academia (aba Plano)', WEEKDAYS],
  ['09:00', 'manha', 'Pós-treino: whey ou refeição com proteína', WEEKDAYS],
  ['09:20', 'manha', 'Banho + rosto + protetor solar', WEEKDAYS],
  ['09:45', 'manha', 'Renda extra: bloco de foco (1h30)', WEEKDAYS],
  ['11:30', 'manha', 'Almoço', WEEKDAYS],
  ['12:15', 'tarde', 'Mochila: marmita, lanche, garrafa, protetor', WEEKDAYS],
  ['12:35', 'tarde', 'Sair pro trabalho (Coroado)', WEEKDAYS],
  ['16:00', 'tarde', 'Lanche com proteína', WEEKDAYS],
  ['19:00', 'noite', 'Refeição no trabalho (marmita)', WEEKDAYS],
  ['22:30', 'noite', 'Ceia leve com proteína', WEEKDAYS],
  ['22:40', 'noite', 'Lavar o rosto + hidratante', WEEKDAYS],
  ['23:00', 'noite', 'Dormir (celular longe 15 min antes)', WEEKDAYS],

  // Sábado (turno alternado: 8h–12h ou 11h–15h)
  ['07:00', 'manha', 'Acordar + café da manhã + creatina', [6]],
  ['', 'manha', 'Trabalho de sábado (4h, ver o turno)', [6]],
  ['', 'tarde', 'Cardio + abdômen 30–40 min (antes ou depois do turno)', [6]],
  ['', 'tarde', 'Tempo com a esposa ou amigos', [6]],
  ['19:30', 'noite', 'Jantar leve antes da live + garrafa d’água', [6]],
  ['20:00', 'noite', 'Live (20h–0h)', [6]],
  ['', 'noite', 'Depois da live: rosto + dormir até 00:30', [6]],

  // Domingo
  ['08:00', 'manha', 'Acordar + creatina', [0]],
  ['08:15', 'manha', 'Pesar e medir a cintura, em jejum (aba Progresso)', [0]],
  ['09:30', 'manha', 'Lavar e revisar a moto (pneus, corrente, óleo, luzes)', [0]],
  ['10:30', 'manha', 'Preparar as marmitas da semana', [0]],
  ['', 'tarde', 'Tempo com a esposa, família ou amigos', [0]],
  ['16:00', 'tarde', 'Planejar a semana + anotar os gastos', [0]],
  ['18:00', 'noite', 'Live (opcional): 18h–22h pra dormir cedo', [0]],
  ['22:40', 'noite', 'Rosto + dormir às 23h (segunda começa às 6h)', [0]],
];

// Lembretes de água (calendário agua.ics): [dias, horários]. Evita o horário do treino e da moto.
const WATER_TIMES = [
  [WEEKDAYS, ['08:30', '10:30', '12:00', '14:00', '15:30', '17:00', '18:30', '20:00', '21:30']],
  [[0, 6], ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00']],
];

function presetItems() {
  return PRESET_ITEMS.map(([time, period, title, days]) => ({ id: uid(), title, period, time, days }));
}

// Treinos por dia da semana (0 = domingo). [exercício, séries×reps, descanso]
const WORKOUTS = {
  1: { title: 'Peito, ombro e tríceps', ex: [
    ['Supino reto (barra ou halter)', '4 × 6–8', '2 min'],
    ['Supino inclinado com halter', '3 × 8–10', '90 s'],
    ['Desenvolvimento com halter sentado', '3 × 8–10', '90 s'],
    ['Elevação lateral', '4 × 12–15', '60 s'],
    ['Crucifixo ou peck deck', '3 × 12', '60 s'],
    ['Tríceps na polia com corda', '3 × 10–12', '60 s'],
    ['Tríceps francês', '2 × 10–12', '60 s'],
    ['Cardio: esteira inclinada, ritmo de caminhada', '15 min', ''],
  ] },
  2: { title: 'Costas e bíceps', ex: [
    ['Puxada frente (ou barra fixa)', '4 × 8–10', '90 s'],
    ['Remada curvada com barra', '4 × 8', '2 min'],
    ['Remada unilateral (serrote)', '3 × 10 cada lado', '60 s'],
    ['Face pull na polia', '3 × 12–15', '60 s'],
    ['Rosca direta', '3 × 8–10', '60 s'],
    ['Rosca martelo', '3 × 10–12', '60 s'],
    ['Cardio: bicicleta moderada', '15 min', ''],
  ] },
  3: { title: 'Pernas (foco em quadríceps)', ex: [
    ['Agachamento livre ou hack', '4 × 6–8', '2–3 min'],
    ['Leg press', '3 × 10–12', '2 min'],
    ['Cadeira extensora', '3 × 12–15', '60 s'],
    ['Stiff', '3 × 8–10', '90 s'],
    ['Panturrilha em pé', '4 × 12–15', '60 s'],
    ['Prancha', '3 × 40 s', '45 s'],
    ['Cardio: caminhada leve', '10 min', ''],
  ] },
  4: { title: 'Superior (volume)', ex: [
    ['Supino inclinado com barra', '3 × 8', '2 min'],
    ['Puxada com pegada fechada', '3 × 8–10', '90 s'],
    ['Remada na máquina', '3 × 10', '90 s'],
    ['Desenvolvimento na máquina', '3 × 10', '90 s'],
    ['Elevação lateral', '3 × 15', '60 s'],
    ['Rosca + tríceps na polia (em sequência)', '3 × 12', '60 s'],
    ['Cardio HIIT na bike: 30 s forte / 60 s leve', '10 min', ''],
  ] },
  5: { title: 'Inferior (posterior e glúteo)', ex: [
    ['Levantamento terra romeno', '4 × 8', '2 min'],
    ['Agachamento búlgaro', '3 × 10 cada perna', '90 s'],
    ['Mesa flexora', '3 × 10–12', '60 s'],
    ['Elevação pélvica', '3 × 10', '90 s'],
    ['Cadeira abdutora', '2 × 15', '60 s'],
    ['Panturrilha sentado', '3 × 15', '60 s'],
    ['Cardio: esteira inclinada', '15 min', ''],
  ] },
  6: { title: 'Cardio + abdômen (horário livre)', ex: [
    ['Caminhada rápida, bike, pelada ou natação', '30–40 min', ''],
    ['Prancha', '3 × 45 s', '45 s'],
    ['Abdominal infra (elevação de pernas)', '3 × 12', '45 s'],
    ['Prancha lateral', '2 × 30 s cada lado', '30 s'],
  ] },
  0: { title: 'Descanso', ex: [
    ['Caminhada leve (opcional)', '20–30 min', ''],
    ['Alongamento / mobilidade', '10 min', ''],
  ] },
};

const TRAINING_TIPS = `
<p><b>Como progredir:</b> use uma carga em que você chegue ao fim da faixa de repetições com 1–2 repetições ainda "sobrando". Quando fizer o número máximo de repetições em <b>todas</b> as séries, aumente a carga na próxima vez (2–5 kg nas pernas, 1–2 kg nos braços). Anote a carga no campo "kg".</p>
<p><b>Aquecimento:</b> 5 min de bike + 1–2 séries leves do primeiro exercício.</p>
<p><b>A cada 6–8 semanas:</b> faça uma semana mais leve (metade das séries) para recuperar.</p>
<p><b>Tempo total:</b> cerca de 60 min de musculação + 10–15 min de cardio. Termina perto das 9h.</p>`;

// Trajetos (calculados no OpenStreetMap; o tempo real já tem a margem do trânsito)
const ROUTES = [
  { title: 'Casa → Santa Etelvina (levar a esposa)', info: '15,6 km · 30–40 min de manhã', dest: 'Santa Etelvina, Manaus - AM', steps: [
    'Saia de casa pelo seu caminho de sempre (Papoula → Girassol) até a <b>Av. Autaz Mirim</b> (Grande Circular).',
    'Siga pela Autaz Mirim no sentido da Cidade de Deus / Rei Pelé · 1,6 km.',
    'Na rotatória, pegue a 2ª saída e continue na avenida, que vira <b>Av. Nossa Senhora da Conceição</b> · 2 km.',
    'Na próxima rotatória, pegue a 2ª saída na <b>Av. Margarita</b>, que continua como Av. Arquiteto José Henriques Bento Rodrigues · 1,3 km.',
    'Vire à <b>direita</b> na <b>Rua Campos Sales</b> · 1,2 km.',
    'Vire à <b>esquerda</b> na <b>Rua 1º de Janeiro</b>. Você já está no Santa Etelvina; siga até o trabalho dela.',
  ] },
  { title: 'Santa Etelvina → Live Academia', info: '14,4 km · 25–30 min', dest: 'Live Academia Autaz Mirim, Manaus', steps: [
    'Saia pela <b>Rua Vicente Martins</b> e vire à <b>direita</b> na <b>Av. 7 de Maio</b> · 1,1 km.',
    'Siga em frente: a avenida continua como <b>Av. das Flores</b> · 4,9 km.',
    'No fim, siga pela <b>Rua Fênix</b> e vire à <b>direita</b> na <b>Av. Rouxinol</b> · 350 m.',
    'Vire à <b>esquerda</b> na <b>Av. Noel Nutels</b> · 1 km.',
    'Na rotatória, pegue a <b>3ª saída</b> na <b>Av. Camapuã</b>.',
    'Mantenha-se à <b>direita</b> e entre na <b>Av. Autaz Mirim</b> descendo · 850 m. A academia (estacionamento do Vitória, antigo Rodrigues) fica do seu lado. <b>Não precisa fazer o retorno.</b>',
  ] },
  { title: 'Casa → Live Academia (sábado e dias saindo de casa)', info: '~3,4 km · 7–10 min', dest: 'Live Academia Autaz Mirim, Manaus', steps: [
    'Desça pela <b>Rua Papoula</b> e vire à <b>direita</b> na <b>Rua Girassol</b> até a <b>Av. Autaz Mirim</b>.',
    'Na Autaz Mirim, a academia fica do outro lado. Siga até perto da <b>Av. Rei Pelé</b>.',
    'Faça o <b>retorno em frente à delegacia</b>.',
    'Desça a Autaz Mirim até a academia, que fica do seu lado direito.',
  ] },
  { title: 'Live Academia → casa', info: '~1,8 km · 3–5 min', dest: 'Rua Batrum, Tancredo Neves, Manaus - AM', steps: [
    'Saia do estacionamento virando à <b>direita</b> na <b>Av. Autaz Mirim</b> · 1,2 km.',
    'Entre no bairro à direita (pela Rua Rio Napo ou pelo seu caminho de sempre) até a Batrum.',
  ] },
  { title: 'Casa → trabalho (Coroado)', info: '7,6 km · 15–20 min', dest: 'Coroado, Manaus - AM', steps: [
    'Saia do bairro até a <b>Av. Autaz Mirim</b>.',
    'Vire à <b>esquerda</b> na Autaz Mirim, no sentido Coroado · 2,3 km.',
    'Siga em frente: a avenida continua como <b>Av. Cosme Ferreira</b> · 3,7 km.',
    'Já no Coroado, vire à <b>direita</b> na <b>Rua Ouro Preto</b> e siga até o trabalho.',
  ] },
  { title: 'Trabalho (Coroado) → casa, às 22h', info: '7,1 km · 10–12 min', dest: 'Rua Batrum, Tancredo Neves, Manaus - AM', steps: [
    'Saia pela <b>Rua Ouro Preto</b> até a <b>Av. Cosme Ferreira</b>.',
    'Siga pela Cosme Ferreira no sentido Grande Circular · 3 km.',
    'Passe pelo complexo viário e continue na <b>Av. Autaz Mirim</b> · 2,2 km.',
    'Entre no bairro à direita até a Batrum.',
  ] },
];

const mapsLink = (dest) => 'https://waze.com/ul?navigate=yes&q=' + encodeURIComponent(dest);

const ROUTES_HTML = `
<p class="muted">O botão abre o Waze já navegando, saindo de onde você estiver, com o trânsito do momento.</p>
${ROUTES.map((r) => `
<div class="route">
  <p><b>${r.title}</b><br><span class="muted">${r.info}</span></p>
  <ol>${r.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
  <a class="btn ghost maps" href="${mapsLink(r.dest)}" target="_blank" rel="noopener">🚦 Abrir no Waze</a>
</div>`).join('')}
<p class="muted small">Pro trajeto ficar exato até a porta, me passe o endereço do trabalho da sua esposa e do seu.</p>`;

// Guias (conteúdo fixo do app)
const GUIDES = [
  ['💊 Suplementos', `
<p><b>Ordem de prioridade (pra gastar bem):</b></p>
<ol>
<li><b>Creatina:</b> a mais estudada e a mais barata. <b>3–5 g todo dia</b>, inclusive nos dias sem treino, em qualquer horário (deixei no café da manhã). Não precisa fazer "saturação". Pode inchar um pouco no começo, porque é água dentro do músculo.</li>
<li><b>Whey:</b> não é obrigatório. Serve para bater a meta de proteína quando a comida não alcança. 1 dose (≈25–30 g de proteína) no pós-treino ou no lanche das 16h.</li>
<li><b>Cafeína:</b> um <b>café coado forte</b> faz quase o mesmo que o pré-treino e custa bem menos. Tome por volta de 06:35, antes de sair: o efeito chega no treino das 07:40. Fique em 150–200 mg nessa dose e não passe de 400 mg no dia todo.</li>
</ol>
<p><b>Sem cafeína depois das 15h:</b> você dorme às 23h e ela atrapalha o sono por muitas horas. No trabalho à noite, prefira água, chá sem cafeína ou café descafeinado.</p>
<p>Se você tiver pressão alta, problema no coração ou nos rins, ou tomar algum remédio, confirme com um médico antes de usar pré-treino ou creatina.</p>`],

  ['🍽️ Alimentação', `
<p><b>Objetivo:</b> perder gordura sem perder músculo. Isso pede um déficit pequeno (comer um pouco menos do que gasta) e <b>proteína alta</b>.</p>
<ul>
<li><b>Proteína:</b> cerca de <b>180 g por dia</b>, divididos em 5 refeições de 30–40 g. Fontes: ovos, frango, peixe (jaraqui, tambaqui, matrinxã), carne magra, iogurte, whey.</li>
<li><b>Prato do almoço e da marmita:</b> metade de salada ou legumes, um quarto de proteína, um quarto de arroz, macaxeira, batata ou feijão.</li>
<li><b>Café da manhã (06:10):</b> algo leve antes da moto e do treino, como pão ou tapioca com 2–3 ovos, banana e café.</li>
<li><b>Ceia (22:30):</b> leve e com proteína: ovos, iogurte, whey com leite. Evite fritura e muito volume à noite, porque atrapalham o sono.</li>
<li><b>Corte primeiro:</b> refrigerante, suco de caixinha, lanche da rua à noite e açaí com açúcar ou leite condensado.</li>
<li><b>Marmitas no domingo:</b> economizam dinheiro e evitam comida de rua no trabalho.</li>
</ul>
<p><b>Como saber se está funcionando:</b> pese e meça a cintura todo domingo. Se a cintura cai e a força no treino se mantém ou sobe, está certo. Se nada mudou em 3 semanas, diminua um pouco o carboidrato da noite.</p>
<p><b>Água:</b> com 100 kg, calor de Manaus e treino, a meta é ~3,5 L por dia (14 copos de 250 ml).</p>`],

  ['😴 Sono', `
<p>Dormindo às 23h e acordando às 6h, você tem <b>7 horas</b>. É o mínimo para ganhar músculo e perder gordura, então cada minuto conta.</p>
<ul>
<li><b>Horário fixo</b> nos dias de semana. No fim de semana, o horário segue as lives (veja abaixo).</li>
<li><b>Live de sábado (20h–0h):</b> dormir até 00:30 e acordar 08:00 no domingo dá 7h30. Tudo certo.</li>
<li><b>Live de domingo:</b> se for das 20h à 0h, você dorme 00:30 e acorda 06:00 na segunda, só 5h30 de sono, e isso atrapalha a semana inteira de treino. Quando fizer, prefira <b>18h–22h</b> (ou no máximo 19h–23h).</li>
<li><b>Ao chegar do trabalho:</b> ceia leve, banho morno, quarto escuro e fresco (ar ou ventilador).</li>
<li><b>Celular fora da cama</b> 15 min antes de dormir. Se precisar, use o modo noturno.</li>
<li><b>Nada de cafeína depois das 15h.</b></li>
<li><b>Se estiver muito cansado:</b> um cochilo de 20 min por volta das 11h, antes do almoço, ajuda. Mais que isso atrapalha a noite.</li>
<li><b>Ronco forte ou acordar cansado mesmo dormindo bem:</b> vale falar com um médico, porque é comum com peso alto e prejudica tudo.</li>
</ul>`],

  ['🧴 Pele', `
<p>Moto, sol forte, capacete e suor são os maiores inimigos da pele aqui.</p>
<ul>
<li><b>Manhã (depois do banho das 09:20):</b> lave o rosto com sabonete facial suave e passe <b>protetor solar FPS 50</b>. Reaplique antes de sair às 12:35, porque são vários minutos de sol na moto.</li>
<li><b>Noite (22:40):</b> lave o rosto para tirar o suor e a sujeira do capacete, e passe um hidratante leve (oil-free).</li>
<li><b>Capacete:</b> lave o forro ou use balaclava e lave toda semana.</li>
<li><b>Fronha:</b> troque 2× por semana.</li>
<li><b>Ajudam muito:</b> água, sono e menos açúcar.</li>
<li><b>Acne, manchas ou espinhas que não passam:</b> procure um dermatologista. Dá para conseguir pelo SUS.</li>
</ul>`],

  ['🛵 Trajeto passo a passo', ROUTES_HTML],

  ['🔧 Moto (domingo, 09:00)', `
<ul>
<li><b>Pneus:</b> calibre toda semana e veja se há desgaste ou prego.</li>
<li><b>Corrente:</b> limpe e lubrifique a cada ~500 km ou depois de pegar chuva.</li>
<li><b>Óleo:</b> confira o nível e troque no prazo do manual.</li>
<li><b>Luzes, freios e buzina:</b> teste tudo.</li>
<li><b>Lavagem:</b> uma vez por semana, ou a cada 15 dias se estiver sem tempo.</li>
</ul>`],

  ['💰 Renda extra', `
<p>Reservei <b>1h30 de segunda a sexta (09:45–11:15)</b>, ou seja, 7h30 por semana de foco, e o domingo à noite para planejar.</p>
<p>Quando você mandar seus ganhos e gastos, a gente decide o que fazer nesse bloco, por exemplo aproveitar as lives que você já faz. Até lá, use o tempo para listar o que você sabe fazer e o que as pessoas já te pedem.</p>`],
];
