/* ==========================================================
   Movitel – redesenho (secção de Pacotes)
   Ficheiro: js/app.js

   O que este ficheiro faz:
   1. Guarda os dados (pacotes) e o estado dos filtros
   2. Guarda e lê dados no localStorage (ficam no dispositivo)
   3. PESQUISA: índice de texto + várias palavras (O(n) por pesquisa)
   4. ORDENAÇÃO: algoritmo Merge Sort feito à mão (O(n log n))
   5. Desenha a lista no ecrã (manipulação do DOM)
   6. Adicionar, remover e comparar pacotes
   7. Mede o desempenho (tempo de pesquisa, carregamento, interacções)

   NOTA: os pacotes abaixo são EXEMPLOS. Troque-os pelos dados
   reais do site da Movitel (nome, preço, validade).
   ========================================================== */
'use strict';

/* ---------- 1. CONSTANTES E DADOS ---------- */
const CHAVES = {
  pacotes: 'movitel_pacotes_v1',
  comparar: 'movitel_comparar_v1',
  tema: 'movitel_tema_v1'
};
const MAX_COMPARAR = 3;       // máximo de pacotes na comparação
const ATRASO_PESQUISA_MS = 250; // espera depois de a pessoa parar de escrever

const ROTULOS_CATEGORIA = { internet: 'Internet', voz: 'Voz', sms: 'SMS', combo: 'Combinado' };
const ROTULOS_PERIODO = { diario: 'Diário', semanal: 'Semanal', mensal: 'Mensal' };

// Dados de exemplo (preços em Meticais)
const PACOTES_INICIAIS = [
  { id: 1,  nome: 'Internet Diária 500 MB',   categoria: 'internet', periodo: 'diario',  preco: 25,   validade: 1,  descricao: '500 MB para redes sociais e mensagens.',        data: '2026-09-01' },
  { id: 2,  nome: 'Internet Diária 1 GB',     categoria: 'internet', periodo: 'diario',  preco: 40,   validade: 1,  descricao: '1 GB para vídeos curtos e navegação.',           data: '2026-09-02' },
  { id: 3,  nome: 'Internet Semanal 3 GB',    categoria: 'internet', periodo: 'semanal', preco: 150,  validade: 7,  descricao: '3 GB durante uma semana.',                       data: '2026-09-03' },
  { id: 4,  nome: 'Internet Mensal 10 GB',    categoria: 'internet', periodo: 'mensal',  preco: 500,  validade: 30, descricao: '10 GB para o mês inteiro.',                      data: '2026-09-04' },
  { id: 5,  nome: 'Internet Mensal 30 GB',    categoria: 'internet', periodo: 'mensal',  preco: 1100, validade: 30, descricao: '30 GB para trabalho e estudo.',                  data: '2026-09-05' },
  { id: 6,  nome: 'Voz Diária 30 min',        categoria: 'voz',      periodo: 'diario',  preco: 20,   validade: 1,  descricao: '30 minutos de chamadas para todas as redes.',    data: '2026-09-06' },
  { id: 7,  nome: 'Voz Semanal 150 min',      categoria: 'voz',      periodo: 'semanal', preco: 120,  validade: 7,  descricao: '150 minutos de chamadas durante a semana.',      data: '2026-09-07' },
  { id: 8,  nome: 'Voz Mensal 600 min',       categoria: 'voz',      periodo: 'mensal',  preco: 400,  validade: 30, descricao: '600 minutos de chamadas por mês.',               data: '2026-09-08' },
  { id: 9,  nome: 'SMS Semanal 100',          categoria: 'sms',      periodo: 'semanal', preco: 30,   validade: 7,  descricao: '100 mensagens de texto.',                        data: '2026-09-09' },
  { id: 10, nome: 'SMS Mensal 500',           categoria: 'sms',      periodo: 'mensal',  preco: 90,   validade: 30, descricao: '500 mensagens de texto.',                        data: '2026-09-10' },
  { id: 11, nome: 'Combinado Semanal',        categoria: 'combo',    periodo: 'semanal', preco: 250,  validade: 7,  descricao: '2 GB, 100 minutos e 50 SMS.',                    data: '2026-09-11' },
  { id: 12, nome: 'Combinado Mensal',         categoria: 'combo',    periodo: 'mensal',  preco: 900,  validade: 30, descricao: '8 GB, 400 minutos e 200 SMS.',                   data: '2026-09-12' }
];

/* ---------- ESTADO DA APLICAÇÃO ---------- */
let pacotes = [];            // lista completa de pacotes
let idsComparar = [];        // ids dos pacotes escolhidos para comparar
let indice = new Map();      // id -> texto normalizado (para pesquisa rápida)
let ultimaPesquisaMs = 0;    // duração da última pesquisa
let interaccoes = 0;         // número de acções do utilizador (taxa de interacção)
let acaoPendente = null;     // função a executar quando a janela de confirmação for aceite

const filtros = { texto: '', categoria: 'todos', periodo: 'todos', ordem: 'preco-asc' };

/* ---------- ATALHOS PARA ELEMENTOS DO HTML ---------- */
const $ = (seletor) => document.querySelector(seletor);
const campoBusca = $('#busca');
const listaEl = $('#lista');
const vazioEl = $('#vazio');
const contagemEl = $('#contagem');
const filtroPeriodoEl = $('#filtro-periodo');
const ordemEl = $('#ordem');
const chips = document.querySelectorAll('.chip');
const comparaVazioEl = $('#comparar-vazio');
const comparaTabelaEl = $('#comparar-tabela');
const formEl = $('#form-novo');
const dialogoEl = $('#dialogo');
const avisosEl = $('#avisos');

/* ---------- 2. ARMAZENAMENTO LOCAL (localStorage) ---------- */
// try/catch: o localStorage pode estar bloqueado (modo privado, por exemplo)
function lerArmazenamento(chave, valorPadrao) {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : valorPadrao;
  } catch (erro) {
    return valorPadrao;
  }
}

function gravarArmazenamento(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch (erro) {
    mostrarAviso('Não foi possível guardar neste dispositivo.', 'erro');
  }
}

/* ---------- 3. PESQUISA ---------- */
// Tira acentos e maiúsculas: "Diário" e "diario" passam a ser iguais
function normalizar(texto) {
  return String(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Constrói o índice UMA vez (quando os dados mudam).
// Assim, cada pesquisa só compara texto já preparado, sem repetir a normalização.
function construirIndice() {
  indice = new Map();
  pacotes.forEach((p) => {
    const texto = [p.nome, p.descricao, ROTULOS_CATEGORIA[p.categoria], ROTULOS_PERIODO[p.periodo]].join(' ');
    indice.set(p.id, normalizar(texto));
  });
}

// Filtra por categoria, período e texto. O texto aceita várias palavras:
// "internet mensal" só devolve pacotes que tenham as DUAS palavras.
function filtrarPacotes() {
  const palavras = normalizar(filtros.texto).split(/\s+/).filter(Boolean);
  return pacotes.filter((p) => {
    if (filtros.categoria !== 'todos' && p.categoria !== filtros.categoria) return false;
    if (filtros.periodo !== 'todos' && p.periodo !== filtros.periodo) return false;
    const texto = indice.get(p.id);
    return palavras.every((palavra) => texto.includes(palavra));
  });
}

/* ---------- 4. ORDENAÇÃO (Merge Sort) ---------- */
// Divide a lista ao meio, ordena cada metade e junta as duas já ordenadas.
// Complexidade O(n log n) e é estável (itens iguais mantêm a ordem).
function ordenarPorFusao(lista, comparador) {
  if (lista.length <= 1) return lista;

  const meio = Math.floor(lista.length / 2);
  const esquerda = ordenarPorFusao(lista.slice(0, meio), comparador);
  const direita = ordenarPorFusao(lista.slice(meio), comparador);

  const resultado = [];
  let i = 0;
  let j = 0;
  while (i < esquerda.length && j < direita.length) {
    if (comparador(esquerda[i], direita[j]) <= 0) resultado.push(esquerda[i++]);
    else resultado.push(direita[j++]);
  }
  return resultado.concat(esquerda.slice(i), direita.slice(j));
}

// Cada critério de ordenação é uma função que compara dois pacotes
const COMPARADORES = {
  'preco-asc': (a, b) => a.preco - b.preco,
  'preco-desc': (a, b) => b.preco - a.preco,
  'nome': (a, b) => a.nome.localeCompare(b.nome, 'pt'),
  'data-desc': (a, b) => b.data.localeCompare(a.data) || b.id - a.id,
  'validade-desc': (a, b) => b.validade - a.validade
};

/* ---------- 5. DESENHAR NO ECRÃ ---------- */
const formatoNumero = new Intl.NumberFormat('pt-MZ', { maximumFractionDigits: 2 });

// Cria um elemento com classe e texto. Usar textContent evita injecção de HTML
// (segurança: o que o utilizador escreve nunca é interpretado como código).
function criar(etiqueta, classe, texto) {
  const el = document.createElement(etiqueta);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function criarCartao(p, destacar) {
  const li = criar('li', 'cartao' + (destacar ? ' cartao--novo' : ''));
  li.dataset.id = p.id;
  li.dataset.categoria = p.categoria;

  li.append(criar('h3', '', p.nome));

  const etiqueta = criar('p', 'cartao__etiqueta');
  const forte = criar('strong', '', ROTULOS_CATEGORIA[p.categoria]);
  etiqueta.append(forte, ' – ' + ROTULOS_PERIODO[p.periodo]);
  li.append(etiqueta);

  const preco = criar('p', 'cartao__preco', formatoNumero.format(p.preco));
  preco.append(criar('span', '', 'MT'));
  li.append(preco);

  li.append(criar('p', 'cartao__texto', p.descricao || 'Sem descrição.'));
  li.append(criar('p', 'cartao__validade', 'Validade: ' + p.validade + (p.validade === 1 ? ' dia' : ' dias')));

  const acoes = criar('div', 'cartao__acoes');

  const btnComparar = criar('button', 'botao botao--pequeno');
  btnComparar.type = 'button';
  btnComparar.dataset.acao = 'comparar';
  btnComparar.setAttribute('aria-label', 'Comparar ' + p.nome);
  acoes.append(btnComparar);

  const btnRemover = criar('button', 'botao botao--leve botao--pequeno', 'Remover');
  btnRemover.type = 'button';
  btnRemover.dataset.acao = 'remover';
  btnRemover.setAttribute('aria-label', 'Remover ' + p.nome);
  acoes.append(btnRemover);

  li.append(acoes);
  actualizarBotaoComparar(btnComparar, p.id);
  return li;
}

// Actualiza o texto e o estado do botão "Comparar" de um cartão
function actualizarBotaoComparar(botao, id) {
  const activo = idsComparar.includes(id);
  botao.textContent = activo ? 'Na comparação' : 'Comparar';
  botao.setAttribute('aria-pressed', String(activo));
}

function actualizarTodosBotoesComparar() {
  listaEl.querySelectorAll('li').forEach((li) => {
    actualizarBotaoComparar(li.querySelector('[data-acao="comparar"]'), Number(li.dataset.id));
  });
}

// Função principal: filtra, ordena e desenha. Mede o tempo que demora.
function renderizar(idDestaque) {
  const inicio = performance.now();
  const resultado = ordenarPorFusao(filtrarPacotes(), COMPARADORES[filtros.ordem]);
  ultimaPesquisaMs = performance.now() - inicio;

  listaEl.replaceChildren(...resultado.map((p) => criarCartao(p, p.id === idDestaque)));
  vazioEl.hidden = resultado.length > 0;

  const n = resultado.length;
  contagemEl.textContent = n + (n === 1 ? ' pacote encontrado' : ' pacotes encontrados');
  actualizarMetricas();
}

/* ---------- COMPARAÇÃO ---------- */
function renderizarComparacao() {
  const escolhidos = idsComparar.map((id) => pacotes.find((p) => p.id === id)).filter(Boolean);

  comparaVazioEl.hidden = escolhidos.length > 0;
  comparaTabelaEl.hidden = escolhidos.length === 0;
  if (escolhidos.length === 0) return;

  // Custo por dia = preço / validade. O mais baixo é destacado com TEXTO (não só cor).
  const custos = escolhidos.map((p) => p.preco / p.validade);
  const menor = Math.min(...custos);

  const tabela = criar('table', 'tabela');
  const cabeca = criar('thead');
  const linhaCab = criar('tr');
  linhaCab.append(Object.assign(criar('th', '', 'Característica'), { scope: 'col' }));

  escolhidos.forEach((p) => {
    const th = criar('th');
    th.scope = 'col';
    th.append(criar('div', '', p.nome));
    const retirar = criar('button', 'botao botao--leve botao--pequeno tabela__retirar', 'Retirar');
    retirar.type = 'button';
    retirar.dataset.retirar = p.id;
    retirar.setAttribute('aria-label', 'Retirar ' + p.nome + ' da comparação');
    th.append(retirar);
    linhaCab.append(th);
  });
  cabeca.append(linhaCab);
  tabela.append(cabeca);

  const corpo = criar('tbody');
  const linhas = [
    ['Categoria', (p) => ROTULOS_CATEGORIA[p.categoria]],
    ['Período', (p) => ROTULOS_PERIODO[p.periodo]],
    ['Preço', (p) => formatoNumero.format(p.preco) + ' MT'],
    ['Validade', (p) => p.validade + (p.validade === 1 ? ' dia' : ' dias')],
    ['O que inclui', (p) => p.descricao || '–']
  ];
  linhas.forEach(([titulo, obter]) => {
    const tr = criar('tr');
    tr.append(Object.assign(criar('th', '', titulo), { scope: 'row' }));
    escolhidos.forEach((p) => tr.append(criar('td', '', obter(p))));
    corpo.append(tr);
  });

  // Linha extra: custo por dia
  const trCusto = criar('tr');
  trCusto.append(Object.assign(criar('th', '', 'Custo por dia'), { scope: 'row' }));
  escolhidos.forEach((p, i) => {
    const td = criar('td', (escolhidos.length > 1 && custos[i] === menor) ? 'melhor' : '', formatoNumero.format(custos[i]) + ' MT/dia');
    if (escolhidos.length > 1 && custos[i] === menor) td.append(criar('small', '', 'Mais barato por dia'));
    trCusto.append(td);
  });
  corpo.append(trCusto);

  tabela.append(corpo);
  comparaTabelaEl.replaceChildren(tabela);
}

function alternarComparacao(id) {
  if (idsComparar.includes(id)) {
    idsComparar = idsComparar.filter((x) => x !== id);
  } else if (idsComparar.length >= MAX_COMPARAR) {
    mostrarAviso('Só pode comparar ' + MAX_COMPARAR + ' pacotes. Retire um para juntar outro.', 'erro');
    return;
  } else {
    idsComparar.push(id);
  }
  gravarArmazenamento(CHAVES.comparar, idsComparar);
  actualizarTodosBotoesComparar();
  renderizarComparacao();
}

/* ---------- 6. REMOVER ---------- */
function removerPacote(id) {
  const p = pacotes.find((x) => x.id === id);
  if (!p) return;

  pacotes = pacotes.filter((x) => x.id !== id);
  idsComparar = idsComparar.filter((x) => x !== id);
  gravarArmazenamento(CHAVES.pacotes, pacotes);
  gravarArmazenamento(CHAVES.comparar, idsComparar);
  construirIndice();

  // Animação de saída e só depois desenha a lista de novo
  const cartao = listaEl.querySelector('[data-id="' + id + '"]');
  if (cartao) cartao.classList.add('cartao--a-sair');
  setTimeout(() => {
    renderizar();
    renderizarComparacao();
    mostrarAviso('Pacote removido: ' + p.nome);
  }, 220);
}

/* ---------- JANELA DE CONFIRMAÇÃO ---------- */
function pedirConfirmacao(mensagem, textoBotao, aoConfirmar) {
  $('#dialogo-texto').textContent = mensagem;
  $('#dialogo-confirmar').textContent = textoBotao;
  acaoPendente = aoConfirmar;

  if (typeof dialogoEl.showModal === 'function') {
    dialogoEl.showModal();
  } else if (window.confirm(mensagem)) { // plano B para navegadores antigos
    aoConfirmar();
  }
}

/* ---------- ADICIONAR ---------- */
function lerFormulario() {
  const dados = new FormData(formEl);
  return {
    nome: String(dados.get('nome')).trim(),
    categoria: String(dados.get('categoria')),
    periodo: String(dados.get('periodo')),
    preco: Number(dados.get('preco')),
    validade: Number(dados.get('validade')),
    descricao: String(dados.get('descricao')).trim()
  };
}

// Devolve um objecto { campo: 'mensagem' } com os erros encontrados
function validarPacote(d) {
  const erros = {};
  if (d.nome.length < 3) erros.nome = 'Escreva um nome com pelo menos 3 letras.';
  else if (pacotes.some((p) => normalizar(p.nome) === normalizar(d.nome))) erros.nome = 'Já existe um pacote com este nome.';
  if (!ROTULOS_CATEGORIA[d.categoria]) erros.categoria = 'Escolha uma categoria.';
  if (!ROTULOS_PERIODO[d.periodo]) erros.periodo = 'Escolha um período.';
  if (!(d.preco > 0) || d.preco > 100000) erros.preco = 'Escreva um preço entre 1 e 100000 MT.';
  if (!Number.isInteger(d.validade) || d.validade < 1 || d.validade > 365) erros.validade = 'Escreva a validade em dias (de 1 a 365).';
  if (d.descricao.length > 100) erros.descricao = 'A descrição pode ter no máximo 100 letras.';
  return erros;
}

function mostrarErros(erros) {
  ['nome', 'categoria', 'periodo', 'preco', 'validade', 'descricao'].forEach((campo) => {
    const entrada = $('#f-' + campo);
    const msg = $('#erro-' + campo);
    const temErro = Boolean(erros[campo]);
    msg.hidden = !temErro;
    msg.textContent = temErro ? erros[campo] : '';
    entrada.setAttribute('aria-invalid', String(temErro));
  });
  const primeiro = Object.keys(erros)[0];
  if (primeiro) $('#f-' + primeiro).focus(); // leva o cursor ao primeiro campo com erro
}

function aoSubmeter(evento) {
  evento.preventDefault();
  const dados = lerFormulario();
  const erros = validarPacote(dados);
  mostrarErros(erros);
  if (Object.keys(erros).length > 0) return;

  const novo = {
    id: Date.now(),
    nome: dados.nome,
    categoria: dados.categoria,
    periodo: dados.periodo,
    preco: dados.preco,
    validade: dados.validade,
    descricao: dados.descricao,
    data: new Date().toISOString().slice(0, 10)
  };
  pacotes.push(novo);
  gravarArmazenamento(CHAVES.pacotes, pacotes);
  construirIndice();

  // Limpa os filtros e ordena por "mais recentes" para o novo pacote aparecer logo
  reporFiltros();
  filtros.ordem = 'data-desc';
  ordemEl.value = 'data-desc';
  renderizar(novo.id);

  formEl.reset();
  mostrarAviso('Pacote adicionado: ' + novo.nome);
  $('#pacotes').scrollIntoView();
}

/* ---------- FILTROS ---------- */
function reporFiltros() {
  filtros.texto = '';
  filtros.categoria = 'todos';
  filtros.periodo = 'todos';
  campoBusca.value = '';
  filtroPeriodoEl.value = 'todos';
  chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.categoria === 'todos')));
}

function limparFiltros() {
  reporFiltros();
  renderizar();
}

// Debounce: só pesquisa quando a pessoa pára de escrever (evita trabalho a mais)
function comAtraso(funcao, espera) {
  let temporizador;
  return (...args) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => funcao(...args), espera);
  };
}

/* ---------- AVISOS (toast) ---------- */
function mostrarAviso(mensagem, tipo) {
  const aviso = criar('div', 'aviso' + (tipo === 'erro' ? ' aviso--erro' : ''), mensagem);
  avisosEl.append(aviso);
  setTimeout(() => aviso.remove(), 3500);
}

/* ---------- TEMA CLARO / ESCURO ---------- */
function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  const botao = $('#btn-tema');
  botao.textContent = tema === 'escuro' ? 'Tema claro' : 'Tema escuro';
  botao.setAttribute('aria-pressed', String(tema === 'escuro'));
}

/* ---------- 7. MÉTRICAS DE DESEMPENHO ---------- */
function actualizarMetricas() {
  $('#m-busca').textContent = ultimaPesquisaMs.toFixed(2).replace('.', ',') + ' ms';
  $('#m-interacoes').textContent = interaccoes;
  $('#m-total').textContent = pacotes.length;
}

function medirCarregamento() {
  // Espera um instante para o navegador fechar o evento "load"
  setTimeout(() => {
    const navegacao = performance.getEntriesByType('navigation')[0];
    const ms = navegacao && navegacao.loadEventEnd ? navegacao.loadEventEnd : performance.now();
    $('#m-carga').textContent = Math.round(ms) + ' ms';
  }, 0);
}

/* ---------- LIGAÇÃO DOS EVENTOS ---------- */
function ligarEventos() {
  // Pesquisa com atraso
  campoBusca.addEventListener('input', comAtraso(() => {
    filtros.texto = campoBusca.value;
    renderizar();
  }, ATRASO_PESQUISA_MS));

  // Chips de categoria
  chips.forEach((chip) => chip.addEventListener('click', () => {
    filtros.categoria = chip.dataset.categoria;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    renderizar();
  }));

  filtroPeriodoEl.addEventListener('change', () => { filtros.periodo = filtroPeriodoEl.value; renderizar(); });
  ordemEl.addEventListener('change', () => { filtros.ordem = ordemEl.value; renderizar(); });
  $('#btn-limpar').addEventListener('click', limparFiltros);
  $('#btn-limpar-vazio').addEventListener('click', limparFiltros);

  // Delegação de eventos: um só "ouvinte" para todos os botões dos cartões
  listaEl.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button[data-acao]');
    if (!botao) return;
    const id = Number(botao.closest('li').dataset.id);

    if (botao.dataset.acao === 'comparar') {
      alternarComparacao(id);
    } else if (botao.dataset.acao === 'remover') {
      const p = pacotes.find((x) => x.id === id);
      pedirConfirmacao('Remover o pacote "' + p.nome + '"?', 'Remover', () => removerPacote(id));
    }
  });

  // Botões "Retirar" dentro da tabela de comparação
  comparaTabelaEl.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button[data-retirar]');
    if (botao) alternarComparacao(Number(botao.dataset.retirar));
  });

  // Formulário
  formEl.addEventListener('submit', aoSubmeter);
  $('#btn-repor').addEventListener('click', () => {
    pedirConfirmacao('Repor os pacotes iniciais? Os pacotes que adicionou serão apagados.', 'Repor', () => {
      pacotes = PACOTES_INICIAIS.map((p) => ({ ...p }));
      idsComparar = [];
      gravarArmazenamento(CHAVES.pacotes, pacotes);
      gravarArmazenamento(CHAVES.comparar, idsComparar);
      construirIndice();
      limparFiltros();
      renderizarComparacao();
      mostrarAviso('Pacotes iniciais repostos.');
    });
  });

  // Janela de confirmação
  $('#dialogo-cancelar').addEventListener('click', () => { acaoPendente = null; dialogoEl.close(); });
  $('#dialogo-confirmar').addEventListener('click', () => {
    const acao = acaoPendente;
    acaoPendente = null;
    dialogoEl.close();
    if (acao) acao();
  });

  // Tema
  $('#btn-tema').addEventListener('click', () => {
    const novo = document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro';
    aplicarTema(novo);
    gravarArmazenamento(CHAVES.tema, novo);
  });

  // Conta as interacções (cliques, escrita, mudanças) para a métrica de utilização
  ['click', 'input', 'change'].forEach((tipo) => {
    document.addEventListener(tipo, () => { interaccoes++; actualizarMetricas(); });
  });

  window.addEventListener('load', medirCarregamento);
}

/* ---------- ARRANQUE ---------- */
function iniciar() {
  // Lê os dados guardados; se não houver, usa os de exemplo
  const guardados = lerArmazenamento(CHAVES.pacotes, null);
  pacotes = Array.isArray(guardados) && guardados.length ? guardados : PACOTES_INICIAIS.map((p) => ({ ...p }));
  idsComparar = lerArmazenamento(CHAVES.comparar, []).filter((id) => pacotes.some((p) => p.id === id)).slice(0, MAX_COMPARAR);

  // Tema: o guardado ou, se não houver, o do sistema
  const temaGuardado = lerArmazenamento(CHAVES.tema, null);
  const sistemaEscuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  aplicarTema(temaGuardado || (sistemaEscuro ? 'escuro' : 'claro'));

  construirIndice();
  ligarEventos();
  renderizar();
  renderizarComparacao();
}

iniciar();
