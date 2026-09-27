const CHAVE = "telemetria_v3"; // Define a chave de armazenamento local para o estado da aplicação.
const CHAVE_RESULTADO = "telemetria_resultado_v3"; // Define a chave de armazenamento local específica para os resultados salvos.
const MAX_ESCALA = 240; // Define a velocidade máxima permitida na escala do velocímetro (240 km/h).
const TOTAL_VEICULOS = 2; // Define a quantidade total de veículos avaliados no fluxo de teste.
const TOTAL_LINHAS = 3; // Define o número padrão de linhas/testes por veículo.

function novaLinha(tempo) {
  return { tempo: String(tempo), vel: "", temp: "", rpm: "" }; // Cria e retorna um objeto estruturado para uma nova linha de medição vazia.
}
function estadoInicial() {
  return {
    cars: [],
    currentCar: 0,
    rows: [novaLinha(0), novaLinha(1), novaLinha(2)],
    results: [],
  }; // Retorna o objeto de estado inicial padrão do sistema com três linhas zeradas.
}
function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE));
    return salvo && Array.isArray(salvo.cars) ? salvo : estadoInicial(); // Tenta carregar e analisar os dados salvos no navegador, ou retorna o estado padrão se falhar.
  } catch {
    return estadoInicial();
  }
}
let estado = carregar(); // Inicializa a variável global de estado com os dados recuperados ou o padrão inicial.
const $ = (id) => document.getElementById(id); // Cria um atalho prático para selecionar elementos do DOM por ID.
const fmt = (n, c = 2) => Number(n).toFixed(c); // Formata um número para uma quantidade específica de casas decimais.
function salvar() {
  localStorage.setItem(CHAVE, JSON.stringify(estado)); // Salva o estado atual da aplicação serializado em JSON no armazenamento local.
}
function mostrar(nome) {
  ["entrada", "dashboard"].forEach((v) =>
    $("view-" + v).classList.add("hidden"),
  );
  $("view-" + nome).classList.remove("hidden");
  window.scrollTo(0, 0); // Alterna a exibição entre as telas principais da aplicação e rola a página para o topo.
}
function aviso(id, texto, erro = false) {
  const el = $(id);
  el.textContent = texto;
  el.style.color = erro ? "var(--vermelho)" : "var(--verde-claro)";
  el.classList.remove("hidden"); // Exibe mensagens de aviso ou erro estilizadas em um elemento específico do DOM.
}

// cadastro do veículo (agora feito junto com a tela de testes)
function lerCarroEntrada() {
  return {
    modelo: $("ent-modelo").value.trim(),
    placa: $("ent-placa").value.trim().toUpperCase(),
    km: parseFloat($("ent-km").value),
    dataTeste: $("ent-data").value,
  }; // Lê e retorna os dados cadastrais do veículo preenchidos nos campos de entrada.
}
function carroAtual() {
  return estado.cars[estado.currentCar]; // Retorna o objeto correspondente ao veículo selecionado no momento.
}
function renderCabecalho() {
  const car = carroAtual();
  $("ent-modelo").value = car ? car.modelo : "";
  $("ent-placa").value = car ? car.placa : "";
  $("ent-km").value = car ? car.km : "";
  $("ent-data").value = car ? car.dataTeste : "";
  $("cad-erro").classList.add("hidden");
  $("chip-veiculo").textContent =
    `VEÍCULO ${estado.currentCar + 1}/2` +
    (car ? `: ${car.modelo} • ${car.placa}` : "");
  $("chip-veiculo").classList.remove("hidden");
  $("test-title").textContent =
    `3 MEDIÇÕES DO VEÍCULO ${estado.currentCar + 1}`;
  $("test-subtitle").textContent = car
    ? `${car.modelo} (${car.placa}) - cada linha representa um teste`
    : "Preencha os dados do veículo e as três medições abaixo";
  $("btn-compilar").textContent =
    estado.currentCar === TOTAL_VEICULOS - 1
      ? "Concluir e comparar"
      : "Salvar veículo e continuar →"; // Atualiza dinamicamente os textos, títulos e inputs do cabeçalho da tela de entrada.
}
function iniciarEntrada() {
  renderCabecalho();
  renderTabela();
  mostrar("entrada"); // Prepara e exibe a tela de cadastro e inserção de dados do veículo.
}

// tabela
function linhasNumericas() {
  return estado.rows.map((r) => ({
    tempo: parseFloat(r.tempo),
    vel: parseFloat(r.vel),
    temp: parseFloat(r.temp),
    rpm: parseFloat(r.rpm),
  })); // Converte os valores textuais da tabela de testes em números para cálculos.
}
function aceleracoes(linhas) {
  return linhas.map((r, i) => {
    if (i === 0) return 0;
    const dt = r.tempo - linhas[i - 1].tempo;
    return dt > 0 ? (r.vel - linhas[i - 1].vel) / 3.6 / dt : NaN;
  }); // Calcula a aceleração instantânea entre as linhas com base na variação de velocidade e tempo.
}
function renderTabela() {
  const tb = $("tbody");
  tb.innerHTML = "";
  estado.rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="seq">#${i + 1}</td><td><input data-f="tempo" type="number" step="0.01" min="0" value="${r.tempo}"></td><td><input data-f="vel" type="number" step="0.1" min="0" value="${r.vel}" placeholder="0"><span class="unid">km/h</span></td><td><input data-f="temp" type="number" step="0.5" value="${r.temp}" placeholder="0"><span class="unid">°C</span></td><td class="acel-calc" data-acel>—</td><td><input data-f="rpm" type="number" step="10" min="0" value="${r.rpm}" placeholder="0"><span class="unid">rpm</span></td><td><button class="btn-del" title="Remover linha">🗑</button></td>`;
    tr.querySelectorAll("input").forEach((input) =>
      input.addEventListener("input", () => {
        estado.rows[i][input.dataset.f] = input.value;
        salvar();
        atualizarAceleracaoColuna();
      }),
    );
    tb.appendChild(tr);
  });
  atualizarAceleracaoColuna(); // Renderiza dinamicamente as linhas da tabela de testes e atribui os ouvintes de eventos de salvamento.
}
function atualizarAceleracaoColuna() {
  const linhas = linhasNumericas(),
    acels = aceleracoes(linhas);
  $("tbody")
    .querySelectorAll("[data-acel]")
    .forEach((td, i) => {
      const r = estado.rows[i],
        t = parseFloat(r.tempo),
        v = parseFloat(r.vel),
        j = linhas.findIndex((l) => l.tempo === t && l.vel === v);
      td.textContent =
        isNaN(t) || isNaN(v)
          ? "—"
          : j >= 0 && !isNaN(acels[j])
            ? fmt(acels[j])
            : "erro";
    }); // Atualiza em tempo real os valores calculados de aceleração exibidos na tabela.
}
$("btn-limpar").onclick = () => {
  estado.rows = [novaLinha(0), novaLinha(1), novaLinha(2)];
  salvar();
  renderTabela();
  $("aviso-erro").classList.add("hidden");
}; // Reseta as linhas da tabela para o valor padrão ao clicar no botão de limpar.

function validar() {
  const linhas = linhasNumericas(),
    trs = $("tbody").querySelectorAll("tr"),
    problemas = [];
  if (estado.rows.length !== TOTAL_LINHAS) problemas.push({ i: 0, f: "tempo" });
  trs.forEach((tr) => {
    tr.classList.remove("erro-linha");
    tr.querySelectorAll("input").forEach((i) =>
      i.classList.remove("campo-erro"),
    );
  });
  estado.rows.forEach((r, i) => {
    const t = parseFloat(r.tempo),
      v = parseFloat(r.vel),
      tp = parseFloat(r.temp);
    if (isNaN(t)) problemas.push({ i, f: "tempo" });
    if (isNaN(v) || v < 0 || v > MAX_ESCALA) problemas.push({ i, f: "vel" });
    if (isNaN(tp) || tp < -20 || tp > 150) problemas.push({ i, f: "temp" });
  });
  for (let k = 1; k < linhas.length; k++)
    if (
      !isNaN(linhas[k].tempo) &&
      !isNaN(linhas[k - 1].tempo) &&
      linhas[k].tempo <= linhas[k - 1].tempo
    )
      problemas.push({ i: k, f: "tempo" });
  if (problemas.length) {
    problemas.forEach((p) => {
      trs[p.i]?.classList.add("erro-linha");
      trs[p.i]?.querySelector(`[data-f="${p.f}"]`)?.classList.add("campo-erro");
    });
    aviso(
      "aviso-erro",
      "Corrija os campos destacados antes de salvar este teste.",
      true,
    );
    return null;
  }
  $("aviso-erro").classList.add("hidden");
  return linhas; // Valida rigorosamente todos os campos preenchidos na tabela, destacando erros e inconsistências.
}
$("btn-validar").onclick = () => {
  if (validar()) aviso("aviso-erro", "Dados válidos - prontos para salvar.");
}; // Aciona a validação dos dados da tabela e exibe feedback visual de sucesso.

function distancia(linhas) {
  let total = 0;
  for (let i = 1; i < linhas.length; i++)
    total +=
      ((linhas[i].vel + linhas[i - 1].vel) / 2) *
      ((linhas[i].tempo - linhas[i - 1].tempo) / 3600);
  return total; // Calcula a distância total percorrida com base na integração trapezoidal da velocidade pelo tempo.
}
function processar(linhas) {
  const acels = aceleracoes(linhas),
    medidas = acels.slice(1).filter(Number.isFinite),
    car = carroAtual();
  const stats = {
    velMedia: linhas.reduce((s, r) => s + r.vel, 0) / linhas.length,
    vMax: Math.max(...linhas.map((r) => r.vel)),
    tempMedia: linhas.reduce((s, r) => s + r.temp, 0) / linhas.length,
    acelMedia: medidas.length
      ? medidas.reduce((s, a) => s + a, 0) / medidas.length
      : 0,
    acels,
    distPercorrida: distancia(linhas),
  };
  car.km += stats.distPercorrida;
  return {
    car: { ...car },
    carId: car.id,
    linhas,
    stats,
    geradoEm: Date.now(),
  }; // Processa as estatísticas gerais do teste (médias, máximas e nova quilometragem do veículo).
}

async function enviarParaNuvem(linhas) {
  const numeroVeiculo = estado.currentCar + 1;
  const car = carroAtual();

  const respostaSessao = await fetch("http://127.0.0.1:8000/api/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nome_teste: `Teste Veículo ${numeroVeiculo} - ${Date.now()}`,
      id_car: numeroVeiculo,
      data_teste: car.dataTeste,
      descricao: "Teste de telemetria realizado pelo frontend",
    }),
  });

  if (!respostaSessao.ok) {
    const erro = await respostaSessao.json();

    throw new Error(erro.detail || "Erro ao criar a sessão de teste.");
  }

  const dadosSessao = await respostaSessao.json();

  const idSessao = dadosSessao.id_sessao;

  for (const linha of linhas) {
    const resposta = await fetch("http://127.0.0.1:8000/api/measurements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_sessao: idSessao,
        time: Math.round(linha.tempo),
        speed: linha.vel,
        motor_temp: linha.temp,
        accel: 0,
      }),
    });

    if (!resposta.ok) {
      const erro = await resposta.json();

      throw new Error(erro.detail || "Erro ao enviar medição para a API.");
    }
  }
  return processar(linhas); // Envia assincronamente as sessões e medições recolhidas para a API backend por HTTP POST.
}
$("btn-compilar").onclick = async () => {
  const dadosCarro = lerCarroEntrada();
  if (
    !dadosCarro.modelo ||
    !dadosCarro.placa ||
    !(dadosCarro.km >= 0) ||
    !dadosCarro.dataTeste
  ) {
    aviso(
      "cad-erro",
      "Preencha modelo, placa, quilometragem e data do teste, todos válidos.",
      true,
    );
    return;
  }
  $("cad-erro").classList.add("hidden");
  const linhas = validar();
  if (!linhas?.length) return;
  estado.cars[estado.currentCar] = { id: estado.currentCar + 1, ...dadosCarro };
  salvar();
  const btn = $("btn-compilar");
  btn.disabled = true;
  aviso("aviso-nuvem", "Salvando sessão de teste...");
  let resultado;
  try {
    resultado = await enviarParaNuvem(linhas);
  } catch (e) {
    btn.disabled = false;
    aviso(
      "aviso-nuvem",
      `Falha ao salvar: ${e.message || "não foi possível conectar à API (verifique se o backend em 127.0.0.1:8000 está rodando)."}`,
      true,
    );
    return;
  }
  estado.results = estado.results
    .filter((r) => r.carId !== resultado.carId)
    .concat(resultado);
  salvar();
  localStorage.setItem(CHAVE_RESULTADO, JSON.stringify(estado.results));
  btn.disabled = false;
  $("aviso-nuvem").classList.add("hidden");
  if (estado.currentCar < TOTAL_VEICULOS - 1) {
    estado.currentCar++;
    estado.rows = [novaLinha(0), novaLinha(1), novaLinha(2)];
    salvar();
    iniciarEntrada();
  } else {
    renderComparacao();
    mostrar("dashboard");
    renderResumo();
  }
}; // Gerencia o evento de submissão do formulário, enviando os dados para a nuvem e avançando de veículo ou abrindo o dashboard.
$("btn-voltar").onclick = () => {
  estado.currentCar = Number($("dash-car-select").value || 0);
  estado.rows = estado.results
    .find((r) => r.carId === carroAtual().id)
    ?.linhas.map((r) => ({
      tempo: String(r.tempo),
      vel: String(r.vel),
      temp: String(r.temp),
      rpm: String(r.rpm || ""),
    })) || [novaLinha(0), novaLinha(1), novaLinha(2)];
  startEntrada(); // Retorna do dashboard para a tela de edição de medições de um veículo específico.
};

// dashboard e gráficos
function fmtData(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`; // Formata uma data no padrão ISO para o formato brasileiro (DD/MM/AAAA).
}
function renderComparacao() {
  const resultados = estado.cars.map((car) =>
    estado.results.find((r) => r.carId === car.id),
  );
  const [c1, c2] = estado.cars;

  $("compare-data-1").textContent = `DATA · ${c1.modelo}`;
  $("compare-data-2").textContent = `DATA · ${c2.modelo}`;
  $("compare-tempo-1").textContent = `TEMPO (S) · ${c1.modelo}`;
  $("compare-tempo-2").textContent = `TEMPO (S) · ${c2.modelo}`;
  $("compare-vel-1").textContent = `VELOCIDADE · ${c1.modelo}`;
  $("compare-vel-2").textContent = `VELOCIDADE · ${c2.modelo}`;
  $("compare-temp-1").textContent = `TEMP. MOTOR · ${c1.modelo}`;
  $("compare-temp-2").textContent = `TEMP. MOTOR · ${c2.modelo}`;
  $("compare-acel-1").textContent = `ACELERAÇÃO · ${c1.modelo}`;
  $("compare-acel-2").textContent = `ACELERAÇÃO · ${c2.modelo}`;

  $("comparacao").innerHTML = Array.from({ length: TOTAL_LINHAS }, (_, i) => {
    const a = resultados[0].linhas[i],
      b = resultados[1].linhas[i];

    const colunasData =
      i === 0
        ? `<td rowspan="${TOTAL_LINHAS}">${fmtData(c1.dataTeste)}</td><td rowspan="${TOTAL_LINHAS}">${fmtData(c2.dataTeste)}</td>`
        : "";

    return `<tr>
      <td>Teste ${i + 1}</td>
      ${colunasData}
      <td>${a.tempo}s</td><td>${b.tempo}s</td>
      <td>${fmt(a.vel, 1)} km/h</td><td>${fmt(b.vel, 1)} km/h</td>
      <td>${fmt(a.temp, 1)} °C</td><td>${fmt(b.temp, 1)} °C</td>
      <td>${fmt(resultados[0].stats.acels[i])} m/s²</td><td>${fmt(resultados[1].stats.acels[i])} m/s²</td>
    </tr>`;
  }).join("");

  $("dash-car-select").innerHTML = estado.cars
    .map((c, i) => `<option value="${i}">${c.modelo} • ${c.placa}</option>`)
    .join("");
  $("dash-car-select").onchange = renderResumo;
  renderResumo(); // Renderiza a tabela comparativa detalhada entre os dois veículos testados.
}
function renderResumo() {
  const car = estado.cars[Number($("dash-car-select").value || 0)],
    resultado = estado.results.find((r) => r.carId === car.id),
    stats = resultado?.stats;
  if (!stats) return;
  $("dash-modelo").textContent = car.modelo;
  $("dash-placa").textContent = car.placa;
  $("dash-km").textContent = car.km.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  });
  animarVelocimetro(stats.velMedia);
  $("st-acel").textContent = fmt(stats.acelMedia);
  $("st-vmax").textContent = Math.round(stats.vMax);
  $("st-temp").textContent = Math.round(stats.tempMedia);
  $("bar-acel").style.width =
    Math.min((Math.abs(stats.acelMedia) / 8) * 100, 100) + "%";
  $("bar-vmax").style.width =
    Math.min((stats.vMax / MAX_ESCALA) * 100, 100) + "%";
  $("bar-temp").style.width =
    Math.min((stats.tempMedia / 150) * 100, 100) + "%";
  desenharGraficos(resultado); // Atualiza os blocos de resumo estatístico e barras de progresso no dashboard.
}
function desenharGraficos(resultado) {
  if (!resultado) return;
  const { linhas, stats } = resultado;
  desenharGrafico(
    $("g-vel"),
    linhas.map((r) => [r.tempo, r.vel]),
    "#4ade80",
    "km/h",
  );
  desenharGrafico(
    $("g-acel"),
    linhas.map((r, i) => [r.tempo, stats.acels[i]]),
    "#60a5fa",
    "m/s²",
  );
  desenharGrafico(
    $("g-temp"),
    linhas.map((r) => [r.tempo, r.temp]),
    "#f59e0b",
    "°C",
  ); // Prepara os conjuntos de dados para a renderização dos gráficos canvas de velocidade, aceleração e temperatura.
}
let animId = null;
function animarVelocimetro(alvo) {
  cancelAnimationFrame(animId);
  const ponteiro = $("ponteiro"),
    num = $("vel-media-num"),
    inicio = performance.now(),
    de = parseFloat(num.dataset.v || 0);
  function frame(t) {
    const p = Math.min((t - inicio) / 700, 1),
      v = de + (alvo - de) * (1 - Math.pow(1 - p, 3));
    ponteiro.setAttribute(
      "transform",
      `rotate(${-120 + Math.min(v / MAX_ESCALA, 1) * 240} 150 150)`,
    );
    num.textContent = Math.round(v);
    if (p < 1) animId = requestAnimationFrame(frame);
    else num.dataset.v = alvo;
  }
  animId = requestAnimationFrame(frame); // Anima suavemente o ponteiro e o número do velocímetro SVG na tela.
}
(function ticks() {
  const g = $("ticks");
  for (let m = 0; m <= 12; m++) {
    const ang = ((-210 + m * 20) * Math.PI) / 180,
      principal = m % 2 === 0,
      x1 = 150 + 122 * Math.cos(ang),
      y1 = 150 + 122 * Math.sin(ang),
      r = principal ? 100 : 111;
    g.innerHTML += `<line x1="${x1}" y1="${y1}" x2="${150 + r * Math.cos(ang)}" y2="${150 + r * Math.sin(ang)}" stroke="${principal ? "#c8d0da" : "#454f5c"}" stroke-width="${principal ? 2.5 : 1.2}"/>`;
    if (principal)
      g.innerHTML += `<text x="${150 + 84 * Math.cos(ang)}" y="${150 + 84 * Math.sin(ang)}" fill="#8b96a3" font-size="14" font-weight="700" font-family="JetBrains Mono" text-anchor="middle" dominant-baseline="middle">${m * 20}</text>`;
  }
})(); // Desenha estaticamente os traços e marcações numéricas da escala do velocímetro SVG.
function desenharGrafico(cv, pts, cor, unid) {
  const pontos = pts.filter(
    (p) => Number.isFinite(p[0]) && Number.isFinite(p[1]),
  );
  if (!pontos.length) return;
  const dpr = window.devicePixelRatio || 1,
    w = cv.clientWidth || 320,
    h = 220;
  cv.width = w * dpr;
  cv.height = h * dpr;
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const P = { l: 44, r: 14, t: 14, b: 30 },
    xs = pontos.map((p) => p[0]),
    ys = pontos.map((p) => p[1]);
  const xMin = Math.min(...xs),
    xMax = Math.max(...xs);
  let yMin = Math.min(...ys, 0),
    yMax = Math.max(...ys);
  if (yMax === yMin) yMax = yMin + 1;
  const X = (v) => P.l + ((v - xMin) / (xMax - xMin || 1)) * (w - P.l - P.r),
    Y = (v) => h - P.b - ((v - yMin) / (yMax - yMin)) * (h - P.t - P.b);
  ctx.strokeStyle = "#1f2733";
  ctx.fillStyle = "#8b96a3";
  ctx.font = "10px JetBrains Mono";
  for (let i = 0; i <= 4; i++) {
    const y = P.t + (i * (h - P.t - P.b)) / 4;
    ctx.beginPath();
    ctx.moveTo(P.l, y);
    ctx.lineTo(w - P.r, y);
    ctx.stroke();
    ctx.fillText((yMax - (i * (yMax - yMin)) / 4).toFixed(1), 6, y + 3);
  }
  ctx.strokeStyle = cor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  pontos.forEach((p, i) =>
    i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])),
  );
  ctx.stroke();
  pontos.forEach((p) => {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(X(p[0]), Y(p[1]), 3.5, 0, 7);
    ctx.fill();
  });
  ctx.fillStyle = "#8b96a3";
  ctx.fillText(unid, w - P.r - 34, P.t + 2); // Renderiza linhas e pontos de um gráfico dinâmico em um elemento HTML5 Canvas.
}
$("btn-graficos").onclick = () => {
  const g = $("graficos");
  g.classList.toggle("hidden");
  $("btn-graficos").textContent = g.classList.contains("hidden")
    ? "Mostrar gráficos ▾"
    : "Esconder gráficos ▴";
  if (!g.classList.contains("hidden")) renderResumo();
}; // Alterna a visibilidade da seção de gráficos analíticos ao clicar no botão correspondente.

if (
  estado.cars.length === TOTAL_VEICULOS &&
  estado.results.length === TOTAL_VEICULOS
) {
  renderComparacao();
  mostrar("dashboard");
  renderResumo();
} else iniciarEntrada(); // Verifica o estado salvo ao carregar a página para decidir se exibe o dashboard ou o cadastro inicial.

// Botão para resetar todo o sistema
$("btn-reset").onclick = () => {
  const confirmacao = confirm(
    "Tem certeza que deseja apagar todos os dados e começar do zero?",
  );

  if (confirmacao) {
    localStorage.removeItem(CHAVE);
    localStorage.removeItem(CHAVE_RESULTADO);

    estado = estadoInicial();
    window.location.reload();
  }
}; // Limpa todo o armazenamento local e reinicia o sistema mediante confirmação do usuário.
