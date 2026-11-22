/* Dados da gestão: planos, clientes, mensalidades e ajustes.

   Dois modos:
   - "firebase": dados no Cloud Firestore, com login Google (uso real)
   - "demo": dados de exemplo salvos só neste navegador (enquanto o Firebase não está configurado,
     ou abrindo o endereço com ?demo)

   Valores em centavos (número inteiro). Datas em texto "AAAA-MM-DD"; meses em "AAAA-MM". */

import { firebaseConfig } from "./firebase-config.js";
import * as U from "./util.js";

const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/12.6.0";
const COLECOES = ["planos", "clientes", "mensalidades"];
const CHAVE_DEMO = "cp-gestao-demo-v1";

export const FORMAS = { pix: "Pix", dinheiro: "Dinheiro", cartao: "Cartão" };
export const OBJETIVOS = ["Emagrecimento", "Hipertrofia", "Condicionamento", "Saúde e qualidade de vida", "Performance esportiva", "Reabilitação"];
export const ORIGENS = ["Site", "Instagram", "Indicação", "WhatsApp", "Academia", "Outro"];
export const MOTIVOS_SAIDA = ["Financeiro", "Falta de tempo", "Mudou de cidade", "Lesão ou saúde", "Atingiu o objetivo", "Foi para outro profissional", "Viagem"];

export const PLANOS_PADRAO = [
  { id: "presencial", nome: "Acompanhamento Presencial", tipo: "presencial", preco: null, precoVariavel: true, medalha: "azul", ativo: true, ordem: 1 },
  { id: "silver", nome: "Silver Starter", tipo: "online", preco: 14000, precoVariavel: false, medalha: "prata", ativo: true, ordem: 2 },
  { id: "gold", nome: "Gold Premium", tipo: "online", preco: 30000, precoVariavel: false, medalha: "ouro", ativo: true, ordem: 3 },
];

export const CONFIG_PADRAO = {
  assinatura: "Claudio Paiva",
  chavePix: "",
  msgLembrete:
    "Olá, {nome}! Tudo bem?\n" +
    "Passando para lembrar da mensalidade do plano {plano} referente a {mes}: {valor}, com vencimento em {vencimento}.\n" +
    "Chave Pix: {pix}\n" +
    "Qualquer dúvida, é só me chamar!\n" +
    "{assinatura}",
  msgAtraso:
    "Olá, {nome}! Tudo bem?\n" +
    "A mensalidade do plano {plano} referente a {mes} ({valor}), que venceu em {vencimento}, ainda está em aberto.\n" +
    "Chave Pix: {pix}\n" +
    "Se já pagou, me manda o comprovante, por favor. Obrigado!\n" +
    "{assinatura}",
};

export const state = {
  modo: null, // "firebase" | "demo"
  usuario: null, // { nome, email, foto }
  pronto: false, // primeira leitura dos dados terminou
  erro: null,
  configExiste: false,
  planos: new Map(),
  clientes: new Map(),
  mensalidades: new Map(),
  config: { ...CONFIG_PADRAO },
};

/* ---------- Avisos de mudança (a tela redesenha) ---------- */
const ouvintes = new Set();
let avisoPendente = false;
export const aoMudar = (fn) => ouvintes.add(fn);
function avisar() {
  if (avisoPendente) return;
  avisoPendente = true;
  queueMicrotask(() => {
    avisoPendente = false;
    ouvintes.forEach((fn) => fn());
  });
}

let aoErroGravar = (e) => console.error(e);
export const quandoErroGravar = (fn) => (aoErroGravar = fn);

let backend = null;
let sincronizado = false; // dados já vieram do servidor (não só do cache do aparelho)

export const modoDemo = () => !firebaseConfig?.apiKey || new URLSearchParams(location.search).has("demo");

function limparDados() {
  for (const col of COLECOES) state[col] = new Map();
  state.config = { ...CONFIG_PADRAO };
  state.configExiste = false;
  state.pronto = false;
  state.erro = null;
  sincronizado = false;
}

/** Tira campos `undefined` (o Firestore não aceita). */
const limpar = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

function gravar(col, id, dados) {
  try {
    return Promise.resolve(backend.put(col, id, limpar(dados))).catch(aoErroGravar);
  } catch (e) {
    aoErroGravar(e);
    return Promise.resolve();
  }
}
function apagar(col, id) {
  try {
    return Promise.resolve(backend.remover(col, id)).catch(aoErroGravar);
  } catch (e) {
    aoErroGravar(e);
    return Promise.resolve();
  }
}

/* =========================================================
   Modo demonstração (localStorage)
   ========================================================= */
export function iniciarDemo() {
  state.modo = "demo";
  state.usuario = { nome: "Claudio Paiva", email: "demonstração" };
  let db = null;
  try {
    db = JSON.parse(localStorage.getItem(CHAVE_DEMO) || "null");
  } catch {
    db = null;
  }
  if (!db || !db.planos) db = dadosDeExemplo();

  const salvarLocal = () => {
    try {
      localStorage.setItem(CHAVE_DEMO, JSON.stringify(db));
    } catch {
      /* navegador sem armazenamento: segue só na memória */
    }
  };
  const publicar = () => {
    for (const col of COLECOES) state[col] = new Map(Object.entries(db[col] || {}).map(([id, d]) => [id, { ...d, id }]));
    state.configExiste = !!db.config;
    state.config = { ...CONFIG_PADRAO, ...(db.config || {}) };
    avisar();
  };

  backend = {
    put(col, id, dados) {
      if (col === "config") db.config = { ...(db.config || {}), ...dados };
      else {
        db[col] ??= {};
        db[col][id] = { ...(db[col][id] || {}), ...dados };
      }
      salvarLocal();
      publicar();
    },
    remover(col, id) {
      delete db[col]?.[id];
      salvarLocal();
      publicar();
    },
    criarSeNaoExiste(col, id, dados) {
      const existe = col === "config" ? !!db.config : !!db[col]?.[id];
      if (!existe) this.put(col, id, dados);
      return Promise.resolve(!existe);
    },
    substituirTudo(novo) {
      db = novo;
      salvarLocal();
      publicar();
    },
  };

  salvarLocal();
  publicar();
  state.pronto = true;
  sincronizado = true;
  return manutencao();
}

export function restaurarExemplo() {
  backend.substituirTudo?.(dadosDeExemplo());
  return manutencao();
}

export function comecarDoZero() {
  const planos = Object.fromEntries(PLANOS_PADRAO.map(({ id, ...p }) => [id, p]));
  backend.substituirTudo?.({ config: { ...CONFIG_PADRAO }, planos, clientes: {}, mensalidades: {} });
}

/* =========================================================
   Modo Firebase (Firestore + login Google)
   ========================================================= */
export async function iniciarFirebase(aoMudarLogin) {
  state.modo = "firebase";
  const [appSdk, authSdk, fs] = await Promise.all([
    import(`${FIREBASE_SDK}/firebase-app.js`),
    import(`${FIREBASE_SDK}/firebase-auth.js`),
    import(`${FIREBASE_SDK}/firebase-firestore.js`),
  ]);
  const app = appSdk.initializeApp(firebaseConfig);
  const auth = authSdk.getAuth(app);
  auth.languageCode = "pt-BR";
  let db;
  try {
    // Guarda uma cópia no aparelho: abre rápido e funciona com internet fraca.
    db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  } catch {
    db = fs.getFirestore(app);
  }

  const provedor = new authSdk.GoogleAuthProvider();
  provedor.setCustomParameters({ prompt: "select_account" });
  let assinaturas = [];

  backend = {
    put: (col, id, dados) => fs.setDoc(fs.doc(db, col, id), dados, { merge: true }),
    remover: (col, id) => fs.deleteDoc(fs.doc(db, col, id)),
    criarSeNaoExiste: (col, id, dados) =>
      fs.runTransaction(db, async (tx) => {
        const ref = fs.doc(db, col, id);
        const snap = await tx.get(ref);
        if (snap.exists()) return false;
        tx.set(ref, dados);
        return true;
      }),
    async entrar() {
      try {
        await authSdk.signInWithPopup(auth, provedor);
      } catch (e) {
        if (e?.code === "auth/popup-blocked" || e?.code === "auth/operation-not-supported-in-this-environment") {
          return authSdk.signInWithRedirect(auth, provedor);
        }
        throw e;
      }
    },
    sair: () => authSdk.signOut(auth),
  };

  authSdk.getRedirectResult(auth).catch((e) => aoMudarLogin({ tipo: "saiu", erro: e }));

  authSdk.onAuthStateChanged(auth, (user) => {
    assinaturas.forEach((cancelar) => cancelar());
    assinaturas = [];
    limparDados();
    if (!user) {
      state.usuario = null;
      aoMudarLogin({ tipo: "saiu" });
      return;
    }
    state.usuario = { nome: user.displayName || "", email: user.email || "", foto: user.photoURL || "" };
    // Quem decide se a conta pode entrar são as regras do Firestore: conta fora da lista recebe "permission-denied".
    let negado = false;
    assinaturas = assinar(fs, db, () => {
      if (negado) return;
      negado = true;
      assinaturas.forEach((cancelar) => cancelar());
      assinaturas = [];
      limparDados();
      aoMudarLogin({ tipo: "negado", email: user.email });
    });
    aoMudarLogin({ tipo: "ok" });
  });
}

function assinar(fs, db, aoNegado) {
  const recebidos = new Set();
  const doServidor = new Set();
  const total = COLECOES.length + 1;
  const marcar = (nome, meta) => {
    recebidos.add(nome);
    if (!meta.fromCache) doServidor.add(nome);
    if (recebidos.size === total) state.pronto = true;
    if (!sincronizado && doServidor.size === total) {
      sincronizado = true;
      manutencao().catch(console.error);
    }
    avisar();
  };
  const falhou = (e) => {
    if (e?.code === "permission-denied") return aoNegado();
    console.error(e);
    state.erro = e?.message || String(e);
    avisar();
  };
  const opcoes = { includeMetadataChanges: true };
  const subs = COLECOES.map((col) =>
    fs.onSnapshot(
      fs.collection(db, col),
      opcoes,
      (snap) => {
        state[col] = new Map(snap.docs.map((d) => [d.id, { ...d.data(), id: d.id }]));
        marcar(col, snap.metadata);
      },
      falhou
    )
  );
  subs.push(
    fs.onSnapshot(
      fs.doc(db, "config", "geral"),
      opcoes,
      (snap) => {
        state.configExiste = snap.exists();
        state.config = { ...CONFIG_PADRAO, ...(snap.data() || {}) };
        marcar("config", snap.metadata);
      },
      falhou
    )
  );
  return subs;
}

export const entrar = () => backend?.entrar?.();
export const sair = () => backend?.sair?.();

/* =========================================================
   Manutenção: primeiro uso e mensalidades do mês
   ========================================================= */
async function manutencao() {
  if (!state.configExiste) {
    const criou = await backend.criarSeNaoExiste("config", "geral", { ...CONFIG_PADRAO, criadoEm: new Date().toISOString() });
    if (criou && state.planos.size === 0) {
      await Promise.all(PLANOS_PADRAO.map(({ id, ...p }) => backend.criarSeNaoExiste("planos", id, p)));
    }
  }
  await gerarMensalidades();
}

/** Ao voltar para o app (ex.: virou o mês), confere se falta criar alguma mensalidade. */
export function reverificar() {
  if (sincronizado && backend) manutencao().catch(console.error);
}

/** Vencimento do mês para o cliente. Se cairia antes do início (ex.: começou dia 21 e vence dia 5),
    a primeira mensalidade vence no dia em que ele começou. */
function vencimentoPara(c, ym) {
  const venc = U.vencimentoDe(ym, c.diaVencimento);
  return c.inicio && venc < c.inicio ? c.inicio : venc;
}

function novaMensalidade(c, ym) {
  return {
    clienteId: c.id,
    competencia: ym,
    vencimento: vencimentoPara(c, ym),
    valor: c.valor ?? 0,
    planoId: c.planoId,
    status: "aberta",
    pagoEm: null,
    forma: null,
    valorPago: null,
    criadoEm: new Date().toISOString(),
  };
}

/** Cria a mensalidade de cada mês, de `cobrarDesde` até o mês atual, para cada cliente ativo.
    O id é cliente_mês, então nunca duplica. */
function gerarMensalidades(somente, { novo = false } = {}) {
  if (!sincronizado || !backend) return Promise.resolve();
  const ate = U.mesAtual();
  const lista = somente ? [somente] : [...state.clientes.values()];
  const tarefas = [];
  for (const c of lista) {
    if (c.status !== "ativo" || !c.cobrarDesde) continue;
    for (const ym of U.mesesEntre(c.cobrarDesde, ate, 24)) {
      const id = `${c.id}_${ym}`;
      if (state.mensalidades.has(id)) continue;
      const dados = novaMensalidade(c, ym);
      // Cliente recém-criado não tem nada no servidor: grava direto (funciona até sem internet).
      // Os outros passam por uma transação, que só grava se ainda não existir (sem internet, tenta na próxima abertura).
      tarefas.push(novo ? gravar("mensalidades", id, dados) : backend.criarSeNaoExiste("mensalidades", id, dados).catch(console.warn));
    }
  }
  return Promise.all(tarefas);
}

/* =========================================================
   Consultas
   ========================================================= */
export const plano = (id) => state.planos.get(id);
export const cliente = (id) => state.clientes.get(id);
export const mensalidade = (id) => state.mensalidades.get(id);

const porNome = (a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR");
export const planosOrdenados = () => [...state.planos.values()].sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99) || porNome(a, b));
export const clientesOrdenados = () => [...state.clientes.values()].sort(porNome);
export const clientesAtivos = () => clientesOrdenados().filter((c) => c.status === "ativo");

export function situacao(m, hj = U.hoje()) {
  if (m.status === "aberta" && m.vencimento < hj) return "atrasada";
  return m.status;
}
export const valorRecebido = (m) => m.valorPago ?? m.valor ?? 0;

const nomeCliente = (m) => cliente(m.clienteId)?.nome || "";
const porVencimento = (a, b) => a.vencimento.localeCompare(b.vencimento) || nomeCliente(a).localeCompare(nomeCliente(b), "pt-BR");
const todas = () => [...state.mensalidades.values()];

export const mensalidadesDoMes = (ym) => todas().filter((m) => m.competencia === ym).sort(porVencimento);
export const mensalidadesDoCliente = (id) =>
  todas()
    .filter((m) => m.clienteId === id)
    .sort((a, b) => b.competencia.localeCompare(a.competencia));
export const mensalidadeDoMes = (clienteId, ym) => state.mensalidades.get(`${clienteId}_${ym}`);
export const abertasDoCliente = (id) => mensalidadesDoCliente(id).filter((m) => m.status === "aberta").sort(porVencimento);

export const atrasadas = () => {
  const hj = U.hoje();
  return todas().filter((m) => situacao(m, hj) === "atrasada").sort(porVencimento);
};

export function vencendo(dias = 7) {
  const hj = U.hoje();
  const limite = U.somaDias(hj, dias);
  return todas()
    .filter((m) => m.status === "aberta" && m.vencimento >= hj && m.vencimento <= limite)
    .sort(porVencimento);
}

export function resumoMes(ym) {
  const hj = U.hoje();
  const r = { previsto: 0, recebido: 0, aReceber: 0, atrasado: 0, qtd: { total: 0, paga: 0, aberta: 0, atrasada: 0, cancelada: 0 } };
  for (const m of mensalidadesDoMes(ym)) {
    const s = situacao(m, hj);
    r.qtd[s]++;
    if (s === "cancelada") continue;
    r.qtd.total++;
    r.previsto += m.valor || 0;
    if (s === "paga") r.recebido += valorRecebido(m);
    else if (s === "atrasada") r.atrasado += m.valor || 0;
    else r.aReceber += m.valor || 0;
  }
  return r;
}

export const receitaRecorrente = () => clientesAtivos().reduce((s, c) => s + (c.valor || 0), 0);

export function resumoPlanos() {
  const ativos = clientesAtivos();
  return planosOrdenados().map((p) => {
    const doPlano = ativos.filter((c) => c.planoId === p.id);
    return {
      plano: p,
      ativos: doPlano.length,
      receita: doPlano.reduce((s, c) => s + (c.valor || 0), 0),
      total: [...state.clientes.values()].filter((c) => c.planoId === p.id).length,
    };
  });
}

export const novosNoMes = (ym) => clientesOrdenados().filter((c) => U.mesDe(c.inicio) === ym);
export const saidasNoMes = (ym) => clientesOrdenados().filter((c) => c.status === "cancelado" && U.mesDe(c.canceladoEm) === ym);

export function mensagemCobranca(m) {
  const c = cliente(m.clienteId);
  const p = plano(m.planoId) || plano(c?.planoId);
  const modelo = situacao(m) === "atrasada" ? state.config.msgAtraso : state.config.msgLembrete;
  return U.preencher(modelo, {
    nome: U.primeiroNome(c?.nome),
    plano: p?.nome || "",
    valor: U.brl(m.valor),
    vencimento: U.diaMes(m.vencimento),
    mes: U.nomeMes(m.competencia),
    pix: state.config.chavePix,
    assinatura: state.config.assinatura,
  });
}

/* =========================================================
   Alterações
   ========================================================= */
const agora = () => new Date().toISOString();

/** Cadastra ou atualiza um cliente. Devolve o id. */
export function salvarCliente(dados) {
  const id = dados.id || U.novoId();
  const anterior = state.clientes.get(id);
  const { id: _ignorar, ...campos } = dados;
  const doc = anterior ? { ...campos, atualizadoEm: agora() } : { status: "ativo", ...campos, criadoEm: agora() };
  gravar("clientes", id, doc);
  const c = { ...(anterior || {}), ...doc, id };

  if (anterior) {
    // Mudou valor, plano ou dia: ajusta as mensalidades ainda em aberto deste mês em diante.
    const mudou =
      anterior.valor !== c.valor || anterior.planoId !== c.planoId || Number(anterior.diaVencimento) !== Number(c.diaVencimento) || anterior.inicio !== c.inicio;
    if (mudou) {
      for (const m of mensalidadesDoCliente(id)) {
        if (m.status === "aberta" && m.competencia >= U.mesAtual()) {
          gravar("mensalidades", m.id, { valor: c.valor, planoId: c.planoId, vencimento: vencimentoPara(c, m.competencia) });
        }
      }
    }
  }
  gerarMensalidades(c, { novo: !anterior });
  return id;
}

export function excluirCliente(id) {
  for (const m of mensalidadesDoCliente(id)) apagar("mensalidades", m.id);
  return apagar("clientes", id);
}

function cancelarAbertas(id) {
  for (const m of abertasDoCliente(id)) gravar("mensalidades", m.id, { status: "cancelada", canceladaEm: U.hoje() });
}

export function pausarCliente(id, { motivo = "", cancelarCobrancas = false } = {}) {
  gravar("clientes", id, { status: "pausado", pausadoEm: U.hoje(), motivoSaida: motivo || null, atualizadoEm: agora() });
  if (cancelarCobrancas) cancelarAbertas(id);
}

export function cancelarCliente(id, { motivo = "", cancelarCobrancas = false } = {}) {
  gravar("clientes", id, { status: "cancelado", canceladoEm: U.hoje(), motivoSaida: motivo || null, atualizadoEm: agora() });
  if (cancelarCobrancas) cancelarAbertas(id);
}

export function reativarCliente(id, { cobrarDesde = U.mesAtual() } = {}) {
  const mudancas = { status: "ativo", cobrarDesde, pausadoEm: null, canceladoEm: null, motivoSaida: null, reativadoEm: U.hoje(), atualizadoEm: agora() };
  gravar("clientes", id, mudancas);
  const c = state.clientes.get(id);
  if (c) gerarMensalidades({ ...c, ...mudancas, id });
}

export const registrarPagamento = (id, { valorPago, pagoEm, forma }) =>
  gravar("mensalidades", id, { status: "paga", valorPago, pagoEm, forma, atualizadoEm: agora() });

export const desfazerPagamento = (id) =>
  gravar("mensalidades", id, { status: "aberta", valorPago: null, pagoEm: null, forma: null, atualizadoEm: agora() });

export const cancelarCobranca = (id) => gravar("mensalidades", id, { status: "cancelada", canceladaEm: U.hoje(), atualizadoEm: agora() });
export const reabrirCobranca = (id) => gravar("mensalidades", id, { status: "aberta", canceladaEm: null, atualizadoEm: agora() });
export const editarCobranca = (id, { valor, vencimento }) => gravar("mensalidades", id, { valor, vencimento, atualizadoEm: agora() });

export function salvarPlano(dados) {
  const id = dados.id || U.novoId();
  const { id: _ignorar, ...campos } = dados;
  if (!state.planos.has(id) && campos.ordem == null) {
    campos.ordem = Math.max(0, ...[...state.planos.values()].map((p) => p.ordem ?? 0)) + 1;
  }
  gravar("planos", id, campos);
  return id;
}
export const excluirPlano = (id) => apagar("planos", id);

export const salvarConfig = (campos) => gravar("config", "geral", { ...campos, atualizadoEm: agora() });

export function backup() {
  const lista = (col) => [...state[col].values()];
  return {
    sistema: "Gestão · Claudio Paiva",
    exportadoEm: agora(),
    config: state.config,
    planos: lista("planos"),
    clientes: lista("clientes"),
    mensalidades: lista("mensalidades"),
  };
}

/* =========================================================
   Dados de exemplo (modo demonstração) — nomes e telefones fictícios
   ========================================================= */
function dadosDeExemplo() {
  const hj = U.hoje();
  const m0 = U.mesAtual();
  const mes = (n) => U.somaMeses(m0, n);
  const dia = (n, d) => U.vencimentoDe(mes(n), d);
  const menor = (a, b) => (a < b ? a : b);
  const maior = (a, b) => (a > b ? a : b);

  // [nome, plano, valor, dia do vencimento, [mês, dia] de início, extras]
  const lista = [
    ["Ana Beatriz Souza", "gold", 30000, 5, [-15, 11], { objetivo: "Hipertrofia", origem: "Instagram", nascimento: "1991-03-14" }],
    ["Bruno Carvalho", "silver", 14000, 10, [-7, 8], { objetivo: "Emagrecimento", origem: "Site", atrasos: [0] }],
    ["Carla Mendes", "presencial", 60000, 5, [-26, 2], { objetivo: "Saúde e qualidade de vida", origem: "Indicação", nascimento: "1968-09-30", obs: "Condromalácia patelar no joelho direito: evitar agachamento profundo." }],
    ["Diego Ramos", "silver", 14000, 15, [-4, 12], { objetivo: "Condicionamento", origem: "Site", atrasos: [-1, 0] }],
    ["Eduarda Lima", "gold", 30000, 20, [-10, 18], { objetivo: "Performance esportiva", origem: "Indicação", nascimento: "1999-12-02" }],
    ["Felipe Andrade", "presencial", 80000, 1, [-30, 1], { objetivo: "Hipertrofia", origem: "Academia", nascimento: "1985-07-21" }],
    ["Gabriela Rocha", "silver", 14000, 25, [-2, 24], { objetivo: "Emagrecimento", origem: "Instagram" }],
    ["Henrique Costa", "gold", 30000, 10, [-12, 9], { objetivo: "Hipertrofia", origem: "Site", obs: "Hipertenso, pressão controlada com medicação. Monitorar a intensidade." }],
    ["Isabela Martins", "silver", 14000, 28, [0, 3], { objetivo: "Saúde e qualidade de vida", origem: "Site" }],
    ["João Pedro Alves", "silver", 14000, 8, [-9, 6], { objetivo: "Hipertrofia", origem: "Instagram", status: "cancelado", saida: [0, 6], motivoSaida: "Mudou de cidade" }],
    ["Larissa Nunes", "gold", 30000, 12, [-6, 10], { objetivo: "Emagrecimento", origem: "Indicação", status: "pausado", saida: [-1, 14], motivoSaida: "Viagem" }],
    ["Marcos Vieira", "presencial", 70000, 12, [-5, 11], { objetivo: "Condicionamento", origem: "WhatsApp", atrasos: [0] }],
    ["Paula Freitas", "silver", 14000, 22, [-3, 20], { objetivo: "Emagrecimento", origem: "Instagram" }],
    ["Rafael Teixeira", "gold", 30000, 26, [-1, 25], { objetivo: "Hipertrofia", origem: "Indicação" }],
  ];

  const formas = ["pix", "pix", "pix", "dinheiro", "cartao"];
  const planos = Object.fromEntries(PLANOS_PADRAO.map(({ id, ...p }) => [id, p]));
  const clientes = {};
  const mensalidades = {};

  lista.forEach(([nome, planoId, valor, diaVenc, [mi, di], extra], i) => {
    const id = `exemplo${String(i + 1).padStart(2, "0")}`;
    const { atrasos = [], saida, status = "ativo", ...resto } = extra;
    const inicio = menor(dia(mi, di), hj);
    const dataSaida = saida ? menor(dia(...saida), hj) : null;
    const cobrarDesde = maior(U.mesDe(inicio), mes(-2));
    clientes[id] = {
      nome,
      whatsapp: "2190000" + String(i + 1).padStart(4, "0"),
      planoId,
      valor,
      diaVencimento: diaVenc,
      inicio,
      cobrarDesde,
      status,
      nascimento: null,
      objetivo: "",
      origem: "",
      obs: "",
      ...resto,
      canceladoEm: status === "cancelado" ? dataSaida : null,
      pausadoEm: status === "pausado" ? dataSaida : null,
      criadoEm: `${inicio}T12:00:00.000Z`,
    };
    const meses = U.mesesEntre(cobrarDesde, m0);
    meses.forEach((ym, k) => {
      const venc = U.vencimentoDe(ym, diaVenc);
      if (dataSaida && venc > dataSaida) return;
      const deslocamento = k - (meses.length - 1); // 0 = mês atual, -1 = mês passado...
      const pago = !atrasos.includes(deslocamento) && venc < hj;
      mensalidades[`${id}_${ym}`] = {
        clienteId: id,
        competencia: ym,
        vencimento: venc,
        valor,
        planoId,
        status: pago ? "paga" : "aberta",
        pagoEm: pago ? menor(U.somaDias(venc, ((i + k) % 5) - 2), hj) : null,
        forma: pago ? formas[(i + k) % formas.length] : null,
        valorPago: pago ? valor : null,
        criadoEm: `${ym}-01T08:00:00.000Z`,
      };
    });
  });

  return { config: { ...CONFIG_PADRAO }, planos, clientes, mensalidades };
}
