/* Gestão · Claudio Paiva — telas e interações */

import * as U from "./util.js";
import * as S from "./store.js";

const { esc } = U;
const $ = (sel, el = document) => el.querySelector(sel);
const ic = (nome, extra = "") => `<svg class="i ${extra}" aria-hidden="true"><use href="#i-${nome}"/></svg>`;

const ui = {
  mes: U.mesAtual(),
  clientes: { status: "ativo", plano: "", busca: "" },
  cobrancas: "todas",
  recemCriado: null,
  montado: false,
  rotaAnterior: "",
};

const NAV = [
  { rota: "painel", rotulo: "Painel", icone: "home" },
  { rota: "clientes", rotulo: "Clientes", icone: "users" },
  { rota: "cobrancas", rotulo: "Cobranças", icone: "receipt" },
  { rota: "planos", rotulo: "Planos", icone: "tag" },
  { rota: "ajustes", rotulo: "Ajustes", icone: "gear" },
];

const SITUACAO = { paga: ["Pago", "ok"], aberta: ["A receber", "info"], atrasada: ["Atrasado", "bad"], cancelada: ["Cancelada", ""] };
const STATUS_CLIENTE = { ativo: ["Ativo", "ok"], pausado: ["Pausado", "warn"], cancelado: ["Cancelado", ""] };
const MEDALHAS = { azul: "Azul", prata: "Prata", ouro: "Ouro" };

/* =========================================================
   Pedacinhos de interface
   ========================================================= */
const chip = ([texto, tom]) => `<span class="chip ${tom}">${texto}</span>`;
const chipSituacao = (s) => chip(SITUACAO[s] || [s, ""]);
const chipCliente = (s) => chip(STATUS_CLIENTE[s] || [s, ""]);
const avatar = (c, p, tam = "") => `<span class="avatar ${p?.medalha || "azul"} ${tam}" aria-hidden="true">${esc(U.iniciais(c?.nome))}</span>`;
const medalha = (p, tam = "") =>
  `<svg class="medalha ${tam}" aria-hidden="true" style="fill:url(#g-${p?.medalha || "azul"})"><use href="#coin"/></svg>`;
const vazio = (texto, extra = "") => `<div class="vazio"><p>${texto}</p>${extra}</div>`;
const tile = (rotulo, valor, icone, nota = "") =>
  `<div class="tile">${ic(icone)}<span class="rotulo">${rotulo}</span><span class="valor">${valor}</span>${nota ? `<small>${nota}</small>` : ""}</div>`;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function navMes() {
  const atual = U.mesAtual();
  return `<div class="mes-nav">
    <button type="button" class="icon-btn" data-act="mes-ant" aria-label="Mês anterior">${ic("left")}</button>
    <span class="mes">${esc(U.capitalizar(U.mesExtenso(ui.mes)))}</span>
    ${ui.mes !== atual ? `<button type="button" class="link" data-act="mes-hoje">Hoje</button>` : ""}
    <button type="button" class="icon-btn" data-act="mes-prox" aria-label="Próximo mês">${ic("right")}</button>
  </div>`;
}

/** Uma linha de cobrança: toca para ver detalhes; botões de cobrar e dar baixa quando está em aberto. */
function linhaCobranca(m, { titulo = "cliente", mostrarMes = false } = {}) {
  const c = S.cliente(m.clienteId);
  const p = S.plano(m.planoId) || S.plano(c?.planoId);
  const s = S.situacao(m);
  const hj = U.hoje();
  const nome = titulo === "mes" ? U.capitalizar(U.mesExtenso(m.competencia)) : c?.nome || "Cliente excluído";

  let sub;
  if (s === "paga") sub = `Pago em ${U.diaMes(m.pagoEm)}${m.forma ? ` · ${S.FORMAS[m.forma]}` : ""}`;
  else if (s === "atrasada") {
    const d = U.diffDias(m.vencimento, hj);
    sub = `Venceu ${U.diaMes(m.vencimento)} · <span class="txt-bad">${plural(d, "dia", "dias")} de atraso</span>`;
  } else if (s === "cancelada") sub = `Vencia ${U.diaMes(m.vencimento)}`;
  else {
    const d = U.diffDias(hj, m.vencimento);
    sub = d === 0 ? `<span class="txt-warn">Vence hoje</span>` : d === 1 ? "Vence amanhã" : `Vence ${U.diaMes(m.vencimento)}`;
  }
  if (titulo === "cliente" && p) sub = `${esc(p.nome)} · ${sub}`;
  if (mostrarMes) sub += ` · ref. ${U.mesCurto(m.competencia)}`;

  const emAberto = s === "aberta" || s === "atrasada";
  const link = emAberto ? U.linkWhats(c?.whatsapp, S.mensagemCobranca(m)) : "";
  const icone = titulo === "mes" ? `<span class="mes-badge">${U.nomeMes(m.competencia).slice(0, 3)}</span>` : avatar(c, p);

  return `<div class="row row-cobranca sit-${s}">
    <button type="button" class="row-btn" data-act="mensalidade" data-id="${esc(m.id)}">
      ${icone}
      <span class="row-main"><span class="row-title">${esc(nome)}</span><span class="row-sub">${sub}</span></span>
      <span class="row-end"><span class="row-valor">${U.brl(s === "paga" ? S.valorRecebido(m) : m.valor)}</span>${chipSituacao(s)}</span>
    </button>
    ${
      emAberto
        ? `<div class="row-acoes">
            ${link ? `<a class="btn btn-sm btn-wa" href="${esc(link)}" target="_blank" rel="noopener">${ic("wa")}<span>Cobrar</span></a>` : ""}
            <button type="button" class="btn btn-sm btn-ok" data-act="pagar" data-id="${esc(m.id)}">${ic("check")}<span>Recebi</span></button>
          </div>`
        : ""
    }
  </div>`;
}

function linhaCliente(c) {
  const p = S.plano(c.planoId);
  const m = S.mensalidadeDoMes(c.id, U.mesAtual());
  const atrasos = S.abertasDoCliente(c.id).filter((x) => S.situacao(x) === "atrasada").length;
  let fim;
  if (c.status !== "ativo") fim = chipCliente(c.status);
  else if (atrasos > 1) fim = chip([`${atrasos} atrasadas`, "bad"]);
  else fim = m ? chipSituacao(S.situacao(m)) : "";
  return `<a class="row" href="#/cliente/${encodeURIComponent(c.id)}">
    ${avatar(c, p)}
    <span class="row-main">
      <span class="row-title">${esc(c.nome)}</span>
      <span class="row-sub">${esc(p?.nome || "Sem plano")} · ${U.brl(c.valor)} · dia ${esc(c.diaVencimento)}</span>
    </span>
    <span class="row-end">${fim}</span>
  </a>`;
}

/* =========================================================
   Telas
   ========================================================= */
const TELAS = {
  painel() {
    const ym = ui.mes;
    const hj = U.hoje();
    const r = S.resumoMes(ym);
    const pct = r.previsto ? Math.round((r.recebido / r.previsto) * 100) : 0;
    const ativos = S.clientesAtivos();
    const recorrente = S.receitaRecorrente();
    const atrasadas = S.atrasadas();
    const proximas = S.vencendo(7);
    const planos = S.resumoPlanos().filter((x) => x.ativos > 0 || x.plano.ativo !== false);
    const hora = new Date().getHours();
    const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
    const nome = U.primeiroNome(S.state.usuario?.nome) || "Claudio";
    const mesCurto = U.nomeMes(ym);

    if (!S.state.clientes.size) {
      return {
        titulo: "Painel",
        html: `
          <div class="saudacao"><p class="kicker">${saudacao}, ${esc(nome)}</p><p class="hoje">${esc(U.dataExtensa(hj))}</p></div>
          <section class="card">${vazio(
            "Nenhum cliente cadastrado ainda. Cadastre o primeiro e o sistema passa a criar as mensalidades sozinho, todo mês.",
            `<button type="button" class="btn" data-act="novo-cliente">${ic("userplus")} Cadastrar cliente</button>`
          )}</section>`,
      };
    }

    const listaPlanos = planos
      .map(({ plano: p, ativos: n, receita }) => {
        const parte = recorrente ? Math.round((receita / recorrente) * 100) : 0;
        return `<div class="plano-linha">
          ${medalha(p)}
          <div><div class="nome">${esc(p.nome)}</div><div class="sub">${plural(n, "aluno", "alunos")}</div><div class="barra"><span style="width:${parte}%"></span></div></div>
          <div class="valor">${U.brl(receita)}<div class="sub">${parte}%</div></div>
        </div>`;
      })
      .join("");

    return {
      titulo: "Painel",
      html: `
        <div class="saudacao"><p class="kicker">${saudacao}, ${esc(nome)}</p><p class="hoje">${esc(U.dataExtensa(hj))}</p></div>
        ${navMes()}
        <section class="hero">
          <p class="rotulo">Recebido em ${esc(mesCurto)}</p>
          <p class="valor-grande">${U.brl(r.recebido)}</p>
          <p class="de">de <strong>${U.brl(r.previsto)}</strong> previstos · ${pct}%</p>
          <div class="barra${pct >= 100 ? " ok" : ""}" role="progressbar" aria-label="Recebido no mês" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${Math.min(pct, 100)}%"></span></div>
          <div class="hero-split">
            <div><span><i class="dot ok"></i>Pagas</span><strong>${r.qtd.paga} de ${r.qtd.total}</strong></div>
            <div><span><i class="dot info"></i>A receber</span><strong>${U.brl(r.aReceber)}</strong></div>
            <div><span><i class="dot bad"></i>Atrasado</span><strong>${U.brl(r.atrasado)}</strong></div>
          </div>
        </section>
        <section class="tiles">
          ${tile("Alunos ativos", ativos.length, "users")}
          ${tile("Receita mensal", U.brl(recorrente), "chart", "se todos os ativos pagarem")}
          ${tile(`Novos em ${esc(mesCurto)}`, S.novosNoMes(ym).length, "userplus")}
          ${tile(`Saídas em ${esc(mesCurto)}`, S.saidasNoMes(ym).length, "logout")}
        </section>
        <div class="grid-2">
          <section class="card">
            <header class="card-head"><h2 class="card-title">Atrasados</h2><span class="contador ${atrasadas.length ? "bad" : ""}">${atrasadas.length}</span></header>
            ${atrasadas.length ? `<div class="rows">${atrasadas.map((m) => linhaCobranca(m, { mostrarMes: m.competencia !== U.mesAtual() })).join("")}</div>` : vazio("Nenhuma mensalidade atrasada.")}
          </section>
          <section class="card">
            <header class="card-head"><h2 class="card-title">Vencem nos próximos 7 dias</h2><span class="contador">${proximas.length}</span></header>
            ${proximas.length ? `<div class="rows">${proximas.map((m) => linhaCobranca(m)).join("")}</div>` : vazio("Nada vencendo nos próximos dias.")}
          </section>
          <section class="card">
            <header class="card-head"><h2 class="card-title">Receita por plano</h2><a class="link" href="#/planos">Ver planos</a></header>
            ${listaPlanos || vazio("Nenhum plano cadastrado.")}
          </section>
        </div>`,
    };
  },

  clientes() {
    const f = ui.clientes;
    const todos = S.clientesOrdenados();
    const conta = (st) => todos.filter((c) => st === "todos" || c.status === st).length;
    const q = U.normalizar(f.busca);
    const qDig = U.soDigitos(f.busca);
    const lista = todos.filter(
      (c) =>
        (f.status === "todos" || c.status === f.status) &&
        (!f.plano || c.planoId === f.plano) &&
        (!q || U.normalizar(c.nome).includes(q) || (qDig.length >= 3 && U.soDigitos(c.whatsapp).includes(qDig)))
    );
    const filtros = [
      ["ativo", "Ativos"],
      ["pausado", "Pausados"],
      ["cancelado", "Cancelados"],
      ["todos", "Todos"],
    ];
    return {
      titulo: "Clientes",
      acoes: `<button type="button" class="btn btn-sm" data-act="novo-cliente">${ic("plus")}<span>Novo</span></button>`,
      html: `
        <div class="toolbar">
          <label class="busca"><span class="sr-only">Buscar cliente</span>${ic("search")}<input id="busca-clientes" type="search" placeholder="Buscar por nome ou telefone" value="${esc(f.busca)}" autocomplete="off" enterkeyhint="search"></label>
          <select id="filtro-plano" aria-label="Filtrar por plano">
            <option value="">Todos os planos</option>
            ${S.planosOrdenados().map((p) => `<option value="${esc(p.id)}" ${f.plano === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}
          </select>
        </div>
        <div class="filtros" role="group" aria-label="Situação">
          ${filtros.map(([v, t]) => `<button type="button" class="filtro ${f.status === v ? "ativo" : ""}" data-act="filtro-clientes" data-valor="${v}" aria-pressed="${f.status === v}">${t}<b>${conta(v)}</b></button>`).join("")}
        </div>
        <section class="card lista">
          ${
            lista.length
              ? `<div class="rows">${lista.map(linhaCliente).join("")}</div>`
              : todos.length
                ? vazio("Nenhum cliente encontrado com esse filtro.")
                : vazio("Nenhum cliente cadastrado ainda.", `<button type="button" class="btn" data-act="novo-cliente">${ic("userplus")} Cadastrar cliente</button>`)
          }
        </section>`,
      depois(view) {
        $("#busca-clientes", view).addEventListener("input", (e) => {
          ui.clientes.busca = e.target.value;
          render();
        });
        $("#filtro-plano", view).addEventListener("change", (e) => {
          ui.clientes.plano = e.target.value;
          render();
        });
      },
    };
  },

  cliente(id) {
    const c = S.cliente(id);
    if (!c) {
      return {
        titulo: "Cliente",
        voltar: "#/clientes",
        html: ui.recemCriado === id ? `<p class="carregando">Carregando…</p>` : `<section class="card">${vazio("Cliente não encontrado.")}</section>`,
      };
    }
    const p = S.plano(c.planoId);
    const hist = S.mensalidadesDoCliente(id);
    const abertas = S.abertasDoCliente(id);
    const proxima = abertas[0];
    const totalPago = hist.filter((m) => m.status === "paga").reduce((s, m) => s + S.valorRecebido(m), 0);
    const idade = U.idade(c.nascimento);
    const linkConversa = U.linkWhats(c.whatsapp, `Olá, ${U.primeiroNome(c.nome)}!`);
    const linkCobrar = proxima ? U.linkWhats(c.whatsapp, S.mensagemCobranca(proxima)) : "";

    let saida = "";
    if (c.status === "cancelado") saida = `<div><dt>Cancelou em</dt><dd>${U.dataBR(c.canceladoEm)}${c.motivoSaida ? `<small>${esc(c.motivoSaida)}</small>` : ""}</dd></div>`;
    if (c.status === "pausado") saida = `<div><dt>Pausado desde</dt><dd>${U.dataBR(c.pausadoEm)}${c.motivoSaida ? `<small>${esc(c.motivoSaida)}</small>` : ""}</dd></div>`;

    return {
      titulo: U.primeiroNome(c.nome) || "Cliente",
      voltar: "#/clientes",
      acoes: `<button type="button" class="icon-btn" data-act="editar-cliente" data-id="${esc(c.id)}" aria-label="Editar cliente">${ic("edit")}</button>`,
      html: `
        <section class="card">
          <div class="perfil-top">
            ${avatar(c, p, "lg")}
            <div>
              <h2>${esc(c.nome)}</h2>
              <p class="perfil-plano">${medalha(p)}${esc(p?.nome || "Sem plano")} · ${U.brl(c.valor)}/mês</p>
              <div>${chipCliente(c.status)}</div>
            </div>
          </div>
          <div class="perfil-acoes">
            ${linkConversa ? `<a class="btn btn-ghost" href="${esc(linkConversa)}" target="_blank" rel="noopener">${ic("wa")}<span>Conversar</span></a>` : ""}
            ${linkCobrar ? `<a class="btn btn-wa" href="${esc(linkCobrar)}" target="_blank" rel="noopener">${ic("wa")}<span>Cobrar</span></a>` : ""}
            ${proxima ? `<button type="button" class="btn btn-ok" data-act="pagar" data-id="${esc(proxima.id)}">${ic("check")}<span>Recebi ${U.nomeMes(proxima.competencia).slice(0, 3)}</span></button>` : ""}
          </div>
        </section>

        <section class="card">
          <dl class="dados">
            <div><dt>WhatsApp</dt><dd>${esc(U.telefoneBR(c.whatsapp)) || "—"}</dd></div>
            <div><dt>Vencimento</dt><dd>Todo dia ${esc(c.diaVencimento)}</dd></div>
            <div><dt>Aluno desde</dt><dd>${U.dataBR(c.inicio)}<small>${esc(U.tempoDesde(c.inicio))}</small></dd></div>
            <div><dt>Total já pago</dt><dd>${U.brl(totalPago)}<small>${plural(hist.filter((m) => m.status === "paga").length, "mensalidade", "mensalidades")}</small></dd></div>
            ${c.nascimento ? `<div><dt>Nascimento</dt><dd>${U.dataBR(c.nascimento)}${idade != null ? `<small>${idade} anos</small>` : ""}</dd></div>` : ""}
            ${c.objetivo ? `<div><dt>Objetivo</dt><dd>${esc(c.objetivo)}</dd></div>` : ""}
            ${c.origem ? `<div><dt>Como chegou</dt><dd>${esc(c.origem)}</dd></div>` : ""}
            ${saida}
          </dl>
          ${c.obs ? `<div class="obs"><h3>Saúde e observações</h3><p>${esc(c.obs)}</p></div>` : ""}
        </section>

        <section class="card">
          <header class="card-head"><h2 class="card-title">Mensalidades</h2><span class="contador">${hist.length}</span></header>
          ${hist.length ? `<div class="rows">${hist.map((m) => linhaCobranca(m, { titulo: "mes" })).join("")}</div>` : vazio(c.status === "ativo" ? `A primeira cobrança é de ${esc(U.mesExtenso(c.cobrarDesde))}.` : "Nenhuma mensalidade.")}
        </section>

        <section class="card acoes-status">
          ${
            c.status === "ativo"
              ? `<button type="button" class="btn btn-warn" data-act="pausar" data-id="${esc(c.id)}">${ic("pause")}<span>Pausar</span></button>
                 <button type="button" class="btn btn-danger" data-act="cancelar-cliente" data-id="${esc(c.id)}">${ic("ban")}<span>Cancelar plano</span></button>`
              : `<button type="button" class="btn" data-act="reativar" data-id="${esc(c.id)}">${ic("play")}<span>Reativar</span></button>`
          }
        </section>`,
    };
  },

  cobrancas() {
    const ym = ui.mes;
    const hj = U.hoje();
    const doMes = S.mensalidadesDoMes(ym);
    const r = S.resumoMes(ym);
    const falta = r.aReceber + r.atrasado;
    const pct = r.previsto ? Math.round((r.recebido / r.previsto) * 100) : 0;
    const grupos = {
      todas: (s) => s !== "cancelada",
      abertas: (s) => s === "aberta",
      atrasadas: (s) => s === "atrasada",
      pagas: (s) => s === "paga",
      canceladas: (s) => s === "cancelada",
    };
    const nomes = { todas: "Todas", abertas: "A receber", atrasadas: "Atrasadas", pagas: "Pagas", canceladas: "Canceladas" };
    const conta = (g) => doMes.filter((m) => grupos[g](S.situacao(m, hj))).length;
    const filtro = grupos[ui.cobrancas] ? ui.cobrancas : "todas";
    const lista = doMes.filter((m) => grupos[filtro](S.situacao(m, hj)));
    const antigas = ym === U.mesAtual() ? S.atrasadas().filter((m) => m.competencia < ym) : [];

    return {
      titulo: "Cobranças",
      html: `
        ${navMes()}
        <section class="card">
          <div class="resumo-faixa">
            <div><span>Previsto</span><strong>${U.brl(r.previsto)}</strong></div>
            <div><span>Recebido</span><strong class="txt-ok">${U.brl(r.recebido)}</strong></div>
            <div><span>Falta</span><strong class="${r.atrasado ? "txt-bad" : ""}">${U.brl(falta)}</strong></div>
          </div>
          <div class="barra${pct >= 100 ? " ok" : ""}"><span style="width:${Math.min(pct, 100)}%"></span></div>
        </section>
        <div class="filtros" role="group" aria-label="Filtrar cobranças">
          ${Object.keys(grupos)
            .filter((g) => g !== "canceladas" || conta(g) > 0)
            .map((g) => `<button type="button" class="filtro ${filtro === g ? "ativo" : ""}" data-act="filtro-cobrancas" data-valor="${g}" aria-pressed="${filtro === g}">${nomes[g]}<b>${conta(g)}</b></button>`)
            .join("")}
        </div>
        <section class="card lista">
          ${
            lista.length
              ? `<div class="rows">${lista.map((m) => linhaCobranca(m)).join("")}</div>`
              : doMes.length
                ? vazio("Nenhuma cobrança neste filtro.")
                : vazio(ym > U.mesAtual() ? "As mensalidades deste mês são criadas quando ele começar." : "Nenhuma cobrança neste mês.")
          }
        </section>
        ${
          antigas.length
            ? `<section class="card">
                <header class="card-head"><h2 class="card-title">Atrasadas de meses anteriores</h2><span class="contador bad">${antigas.length}</span></header>
                <div class="rows">${antigas.map((m) => linhaCobranca(m, { mostrarMes: true })).join("")}</div>
              </section>`
            : ""
        }`,
    };
  },

  planos() {
    const lista = S.resumoPlanos();
    const ativos = S.clientesAtivos().length;
    const recorrente = S.receitaRecorrente();
    const cards = lista
      .map(({ plano: p, ativos: n, receita }) => {
        const preco = p.precoVariavel
          ? `<p class="plano-preco variavel">Valor combinado com cada aluno</p>`
          : `<p class="plano-preco">${U.brl(p.preco)}<small>/mês</small></p>`;
        return `<article class="card plano-card ${p.ativo === false ? "inativo" : ""}">
          <header>
            ${medalha(p, "lg")}
            <div><p class="plano-tipo">${p.tipo === "presencial" ? "Presencial" : "Consultoria online"}${p.ativo === false ? " · desativado" : ""}</p><h2>${esc(p.nome)}</h2></div>
            <button type="button" class="icon-btn" data-act="editar-plano" data-id="${esc(p.id)}" aria-label="Editar ${esc(p.nome)}">${ic("edit")}</button>
          </header>
          ${preco}
          <div class="plano-stats">
            <div><strong>${n}</strong><span>${n === 1 ? "aluno ativo" : "alunos ativos"}</span></div>
            <div><strong>${U.brl(receita)}</strong><span>por mês</span></div>
          </div>
        </article>`;
      })
      .join("");
    return {
      titulo: "Planos",
      acoes: `<button type="button" class="btn btn-sm" data-act="novo-plano">${ic("plus")}<span>Plano</span></button>`,
      html: `
        <section class="tiles tiles-2">
          ${tile("Receita mensal", U.brl(recorrente), "chart", plural(ativos, "aluno ativo", "alunos ativos"))}
          ${tile("Média por aluno", U.brl(ativos ? Math.round(recorrente / ativos) : 0), "cash", "valor mensal médio")}
        </section>
        <div class="planos-grid">${cards || vazio("Nenhum plano cadastrado.")}</div>`,
    };
  },

  ajustes() {
    const cfg = S.state.config;
    const demo = S.state.modo === "demo";
    return {
      titulo: "Ajustes",
      html: `
        <form class="card form" id="form-ajustes">
          <h2>Mensagens de cobrança</h2>
          <div class="field-row">
            <div class="field"><label for="a-assinatura">Assinatura</label><input id="a-assinatura" name="assinatura" value="${esc(cfg.assinatura)}" autocomplete="off"></div>
            <div class="field"><label for="a-pix">Chave Pix</label><input id="a-pix" name="chavePix" value="${esc(cfg.chavePix)}" placeholder="CPF, e-mail, celular ou aleatória" autocomplete="off"></div>
          </div>
          <div class="field">
            <label for="a-lembrete">Lembrete (antes de vencer)</label>
            <textarea id="a-lembrete" name="msgLembrete" rows="6">${esc(cfg.msgLembrete)}</textarea>
          </div>
          <div class="field">
            <label for="a-atraso">Cobrança atrasada</label>
            <textarea id="a-atraso" name="msgAtraso" rows="6">${esc(cfg.msgAtraso)}</textarea>
          </div>
          <div class="field">
            <span class="label">Palavras que o sistema troca sozinho</span>
            <div class="variaveis">${["nome", "plano", "valor", "vencimento", "mes", "pix", "assinatura"].map((v) => `<code>{${v}}</code>`).join("")}</div>
            <p class="hint">Linha com {pix} some da mensagem enquanto a chave Pix estiver vazia.</p>
          </div>
          <div class="field">
            <span class="label">Como o aluno recebe (exemplo do lembrete)</span>
            <pre class="previa" id="previa-msg"></pre>
          </div>
          <div><button type="submit" class="btn">${ic("check")} Salvar ajustes</button></div>
        </form>

        <section class="card form">
          <h2>Cópia de segurança</h2>
          <p class="hint">Baixa um arquivo com todos os clientes, planos e mensalidades. Bom guardar um por mês.</p>
          <div><button type="button" class="btn btn-ghost" data-act="backup">${ic("download")} Baixar backup</button></div>
        </section>

        <section class="card form">
          <h2>Instalar no celular</h2>
          <p class="hint"><strong>Android (Chrome):</strong> menu ⋮ → <em>Instalar app</em> ou <em>Adicionar à tela inicial</em>.<br>
          <strong>iPhone (Safari):</strong> botão Compartilhar → <em>Adicionar à Tela de Início</em>.</p>
        </section>

        ${
          demo
            ? `<section class="card form">
                <h2>Modo demonstração</h2>
                <p class="hint">Os dados aqui são de exemplo e ficam só neste navegador. Quando o Firebase for configurado, o sistema passa a pedir login e a guardar tudo na nuvem.</p>
                <div class="acoes-status">
                  <button type="button" class="btn btn-ghost" data-act="demo-restaurar">${ic("undo")} Restaurar exemplo</button>
                  <button type="button" class="btn btn-danger" data-act="demo-zerar">${ic("trash")} Começar do zero</button>
                </div>
              </section>`
            : `<section class="card form">
                <h2>Conta</h2>
                <p class="hint">Conectado como <strong>${esc(S.state.usuario?.email)}</strong></p>
                <div><button type="button" class="btn btn-ghost" data-act="sair">${ic("logout")} Sair</button></div>
              </section>`
        }`,
      depois(view) {
        const form = $("#form-ajustes", view);
        const exemplo = S.clientesAtivos()[0];
        const previa = () => {
          const fd = new FormData(form);
          const p = S.plano(exemplo?.planoId) || S.planosOrdenados()[0];
          const ym = U.mesAtual();
          $("#previa-msg", view).textContent = U.preencher(fd.get("msgLembrete"), {
            nome: U.primeiroNome(exemplo?.nome) || "Ana",
            plano: p?.nome || "Silver Starter",
            valor: U.brl(exemplo?.valor ?? p?.preco ?? 14000),
            vencimento: U.diaMes(U.vencimentoDe(ym, exemplo?.diaVencimento || 10)),
            mes: U.nomeMes(ym),
            pix: fd.get("chavePix"),
            assinatura: fd.get("assinatura"),
          });
        };
        previa();
        form.addEventListener("input", () => {
          form.dataset.sujo = "1";
          previa();
        });
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          S.salvarConfig({
            assinatura: String(fd.get("assinatura")).trim(),
            chavePix: String(fd.get("chavePix")).trim(),
            msgLembrete: String(fd.get("msgLembrete")).trim() || S.CONFIG_PADRAO.msgLembrete,
            msgAtraso: String(fd.get("msgAtraso")).trim() || S.CONFIG_PADRAO.msgAtraso,
          });
          delete form.dataset.sujo;
          toast("Ajustes salvos");
          render();
        });
      },
    };
  },
};

function telaErroDados() {
  return {
    titulo: "Erro",
    html: `<section class="card form">
      <div class="aviso bad">Não foi possível carregar os dados: ${esc(S.state.erro)}</div>
      <div><button type="button" class="btn btn-ghost" data-act="sair">${ic("logout")} Sair</button></div>
    </section>`,
  };
}

/* =========================================================
   Montagem e navegação
   ========================================================= */
function rotaAtual() {
  const [nome, param] = location.hash.replace(/^#\/?/, "").split("/");
  return { nome: nome || "painel", param: param ? decodeURIComponent(param) : null };
}

function montarShell() {
  if (ui.montado) return;
  const links = (cls) =>
    NAV.map((n) => `<a class="${cls}" href="#/${n.rota}" data-rota="${n.rota}">${ic(n.icone)}<span>${n.rotulo}</span></a>`).join("");
  $("#app").innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <a class="brand" href="#/painel"><img src="/assets/img/logo-mark.png" alt="" width="790" height="435"><span><strong>Claudio Paiva</strong><small>Gestão</small></span></a>
        <nav class="side-nav" aria-label="Principal">${links("side-link")}</nav>
        <div class="side-foot" id="side-foot"></div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div class="topbar-start" id="topbar-start"></div>
          <h1 class="topbar-title" id="titulo">Painel</h1>
          <div class="topbar-end" id="topbar-end"></div>
        </header>
        ${S.state.modo === "demo" ? `<div class="demo-banner">${ic("alert")}<span><strong>Modo demonstração.</strong> Dados de exemplo, salvos só neste navegador.</span></div>` : ""}
        <main class="view" id="view" tabindex="-1"></main>
      </div>
      <nav class="tabbar" aria-label="Principal">${links("tab")}</nav>
    </div>`;
  ui.montado = true;
}

/** Redesenha a tela atual. `porDados` = veio de uma mudança nos dados (não de navegação). */
function render(porDados = false) {
  if (!ui.montado) return;
  const { nome, param } = rotaAtual();
  const chave = `${nome}/${param || ""}`;
  const mesmaRota = chave === ui.rotaAnterior;
  const view = $("#view");

  // Não apaga um formulário que está sendo editado.
  if (porDados && mesmaRota && view.querySelector("[data-sujo]")) return;

  const ativa = nome === "cliente" ? "clientes" : nome;
  document.querySelectorAll("[data-rota]").forEach((a) => {
    const on = a.dataset.rota === ativa;
    a.classList.toggle("ativo", on);
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  const st = S.state;
  let tela;
  if (st.erro) tela = telaErroDados();
  else if (!st.pronto) tela = { titulo: "Carregando", html: `<p class="carregando">Carregando dados…</p>` };
  else tela = (TELAS[nome] || TELAS.painel)(param);

  // Guarda o foco (ex.: campo de busca) para devolver depois de redesenhar.
  const focoId = document.activeElement?.id;
  const cursor = document.activeElement?.selectionStart;

  $("#titulo").textContent = tela.titulo;
  $("#topbar-start").innerHTML = tela.voltar
    ? `<a class="icon-btn" href="${tela.voltar}" aria-label="Voltar">${ic("back")}</a>`
    : `<img class="topbar-logo" src="/assets/img/logo-mark.png" alt="" width="790" height="435">`;
  $("#topbar-end").innerHTML = tela.acoes || "";
  view.innerHTML = tela.html;
  tela.depois?.(view);
  document.title = `${tela.titulo} · Gestão Claudio Paiva`;

  $("#side-foot").innerHTML =
    st.modo === "demo"
      ? `<small>Modo demonstração</small>`
      : `<small title="${esc(st.usuario?.email)}">${esc(st.usuario?.email)}</small><button type="button" class="btn btn-ghost btn-sm" data-act="sair">${ic("logout")} Sair</button>`;

  if (focoId && mesmaRota) {
    const el = document.getElementById(focoId);
    if (el && view.contains(el)) {
      el.focus();
      if (cursor != null && el.setSelectionRange) el.setSelectionRange(cursor, cursor);
    }
  }
  if (!mesmaRota) window.scrollTo(0, 0);
  ui.rotaAnterior = chave;
}

function telaLogin(estado = {}) {
  ui.montado = false;
  ui.rotaAnterior = "";
  fecharSheet();
  const negado = estado.tipo === "negado";
  $("#app").innerHTML = `
    <div class="login">
      <div class="login-card">
        <img class="login-logo" src="/assets/img/logo.png" alt="Claudio Paiva · Personal Trainer" width="936" height="681">
        <h1 class="login-title"><span class="chrome">Gestão</span></h1>
        <p class="login-sub">Clientes, planos e mensalidades em um só lugar.</p>
        ${
          negado
            ? `<div class="aviso bad">A conta <strong>${esc(estado.email)}</strong> não tem acesso a este sistema.</div>
               <button type="button" class="btn btn-ghost btn-block" data-act="sair">Entrar com outra conta</button>`
            : `<button type="button" class="btn btn-google btn-block" data-act="entrar">${ic("google")} Entrar com Google</button>`
        }
        <p class="login-erro" id="login-erro" role="alert">${estado.erro ? esc(mensagemErroLogin(estado.erro)) : ""}</p>
      </div>
    </div>`;
}

function telaFalha(texto) {
  ui.montado = false;
  $("#app").innerHTML = `<div class="login"><div class="login-card"><img class="login-logo" src="/assets/img/logo.png" alt="" width="936" height="681"><div class="aviso bad">${texto}</div><button type="button" class="btn btn-block" onclick="location.reload()">Tentar de novo</button></div></div>`;
}

function mensagemErroLogin(e) {
  const code = e?.code || "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "";
  if (code === "auth/unauthorized-domain") return "Este endereço não está autorizado no Firebase (Authentication → Configurações → Domínios autorizados).";
  if (code === "auth/network-request-failed") return "Sem conexão com a internet. Tente de novo.";
  if (code === "auth/operation-not-allowed" || code === "auth/configuration-not-found") return "O login com Google ainda não foi ativado no Firebase (Authentication → Método de login).";
  return e?.message || "Não foi possível entrar. Tente de novo.";
}

/* =========================================================
   Janela (bottom sheet), confirmação e avisos
   ========================================================= */
let sheetAtual = null;

function abrirSheet({ titulo, corpo, rodape = "", aoEnviar, aoAbrir, aoFechar }) {
  const dlg = $("#sheet");
  const anterior = sheetAtual;
  sheetAtual = { aoFechar };
  anterior?.aoFechar?.();
  dlg.innerHTML = `
    <form class="sheet" autocomplete="off" tabindex="-1">
      <header class="sheet-head">
        <h2 id="sheet-titulo">${esc(titulo)}</h2>
        <button type="button" class="icon-btn" data-fechar aria-label="Fechar">${ic("x")}</button>
      </header>
      <div class="sheet-body">${corpo}</div>
      ${rodape ? `<footer class="sheet-foot">${rodape}</footer>` : ""}
    </form>`;
  const form = $("form", dlg);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!aoEnviar) return fecharSheet();
    const resultado = aoEnviar(new FormData(form), form, e.submitter);
    if (resultado !== false) fecharSheet();
  });
  if (!dlg.open) dlg.showModal();
  aoAbrir?.(form);
  // O navegador põe o foco no primeiro botão (o "fechar"); um Enter sem querer fecharia a janela.
  if (!form.contains(document.activeElement) || document.activeElement.matches("[data-fechar]")) form.focus();
  return form;
}

function fecharSheet() {
  const dlg = $("#sheet");
  if (dlg?.open) dlg.close();
}

function confirmar({ titulo, texto, botao = "Confirmar", tom = "" }) {
  return new Promise((resolve) => {
    let ok = false;
    abrirSheet({
      titulo,
      corpo: `<p>${texto}</p>`,
      rodape: `<button type="button" class="btn btn-ghost" data-fechar>Voltar</button><button type="submit" class="btn ${tom}">${botao}</button>`,
      aoEnviar: () => {
        ok = true;
      },
      aoFechar: () => resolve(ok),
    });
  });
}

function toast(texto, { acao, aoClicar, erro = false } = {}) {
  const el = document.createElement("div");
  el.className = `toast${erro ? " erro" : ""}`;
  el.innerHTML = `<span>${esc(texto)}</span>${acao ? `<button type="button">${esc(acao)}</button>` : ""}`;
  if (acao) {
    el.querySelector("button").addEventListener("click", () => {
      aoClicar?.();
      el.remove();
    });
  }
  $("#toasts").append(el);
  setTimeout(() => el.classList.add("saindo"), erro ? 7000 : 4500);
  setTimeout(() => el.remove(), erro ? 7400 : 4900);
}

/* =========================================================
   Formulários
   ========================================================= */
function opcoesMeses(selecionado, de = -12, ate = 2) {
  const atual = U.mesAtual();
  const meses = [];
  for (let k = de; k <= ate; k++) meses.push(U.somaMeses(atual, k));
  if (selecionado && !meses.includes(selecionado)) meses.unshift(selecionado);
  return meses
    .map((ym) => `<option value="${ym}" ${ym === selecionado ? "selected" : ""}>${U.capitalizar(U.mesExtenso(ym))}${ym === atual ? " (este mês)" : ""}</option>`)
    .join("");
}

const datalist = (id, itens) => `<datalist id="${id}">${itens.map((i) => `<option value="${esc(i)}"></option>`).join("")}</datalist>`;

function abrirFormCliente(c) {
  const novo = !c;
  const planos = S.planosOrdenados().filter((p) => p.ativo !== false || p.id === c?.planoId);
  if (!planos.length) {
    toast("Cadastre um plano antes do primeiro cliente.", { erro: true });
    location.hash = "#/planos";
    return;
  }
  const hj = U.hoje();
  const planoInicial = c ? S.plano(c.planoId) : planos.find((p) => !p.precoVariavel) || planos[0];
  const v = c || {
    planoId: planoInicial.id,
    valor: planoInicial.precoVariavel ? null : planoInicial.preco,
    diaVencimento: Math.min(Number(hj.slice(8)), 28),
    inicio: hj,
    cobrarDesde: U.mesAtual(),
  };

  abrirSheet({
    titulo: novo ? "Novo cliente" : "Editar cliente",
    corpo: `
      <div class="field"><label for="f-nome">Nome completo</label><input id="f-nome" name="nome" required value="${esc(v.nome)}" autocapitalize="words"></div>
      <div class="field"><label for="f-whats">WhatsApp com DDD</label><input id="f-whats" name="whatsapp" type="tel" inputmode="tel" required placeholder="(21) 90000-0000" value="${esc(v.whatsapp ? U.telefoneBR(v.whatsapp) : "")}"></div>
      <div class="field-row">
        <div class="field"><label for="f-plano">Plano</label>
          <select id="f-plano" name="planoId" required>${planos.map((p) => `<option value="${esc(p.id)}" ${p.id === v.planoId ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select>
        </div>
        <div class="field"><label for="f-valor">Valor por mês</label><div class="com-prefixo"><span>R$</span><input id="f-valor" name="valor" inputmode="decimal" required placeholder="0,00" value="${esc(U.dinheiroCampo(v.valor))}"></div></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="f-dia">Dia do vencimento</label><input id="f-dia" name="diaVencimento" type="number" inputmode="numeric" min="1" max="31" required value="${esc(v.diaVencimento)}"></div>
        <div class="field"><label for="f-inicio">Início</label><input id="f-inicio" name="inicio" type="date" required value="${esc(v.inicio)}"></div>
      </div>
      <div class="field">
        <label for="f-cobrar">Primeira mensalidade no sistema</label>
        <select id="f-cobrar" name="cobrarDesde">${opcoesMeses(v.cobrarDesde)}</select>
        <p class="hint">A partir deste mês o sistema cria a mensalidade sozinho, todo mês. Para quem já é aluno, deixe o mês atual.</p>
      </div>
      <details class="mais" ${novo ? "" : "open"}>
        <summary>Mais informações</summary>
        <div class="form">
          <div class="field-row">
            <div class="field"><label for="f-nasc">Nascimento</label><input id="f-nasc" name="nascimento" type="date" value="${esc(v.nascimento)}"></div>
            <div class="field"><label for="f-origem">Como chegou</label>
              <select id="f-origem" name="origem"><option value="">—</option>${S.ORIGENS.map((o) => `<option ${o === v.origem ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>
            </div>
          </div>
          <div class="field"><label for="f-objetivo">Objetivo</label><input id="f-objetivo" name="objetivo" list="lista-objetivos" value="${esc(v.objetivo)}" placeholder="Ex.: Hipertrofia">${datalist("lista-objetivos", S.OBJETIVOS)}</div>
          <div class="field"><label for="f-obs">Saúde e observações</label><textarea id="f-obs" name="obs" rows="3" placeholder="Lesões, restrições, medicamentos…">${esc(v.obs)}</textarea></div>
        </div>
      </details>`,
    rodape: `${novo ? `<button type="button" class="btn btn-ghost" data-fechar>Voltar</button>` : `<button type="button" class="btn btn-danger esq" data-act="excluir-cliente" data-id="${esc(c.id)}">${ic("trash")}<span>Excluir</span></button>`}
      <button type="submit" class="btn">${ic("check")}<span>${novo ? "Cadastrar" : "Salvar"}</span></button>`,
    aoAbrir(form) {
      const plano = $("#f-plano", form);
      const valor = $("#f-valor", form);
      const whats = $("#f-whats", form);
      plano.addEventListener("change", () => {
        const p = S.plano(plano.value);
        if (!p) return;
        if (!p.precoVariavel && p.preco != null) valor.value = U.dinheiroCampo(p.preco);
        else valor.value = c && c.planoId === p.id ? U.dinheiroCampo(c.valor) : "";
      });
      valor.addEventListener("input", () => valor.setCustomValidity(""));
      whats.addEventListener("input", () => whats.setCustomValidity(""));
      whats.addEventListener("blur", () => {
        if (U.numeroWhats(whats.value)) whats.value = U.telefoneBR(whats.value);
      });
      if (novo) $("#f-nome", form).focus();
    },
    aoEnviar(fd, form) {
      const valorCentavos = U.lerDinheiro(fd.get("valor"));
      const valor = $("#f-valor", form);
      const whats = $("#f-whats", form);
      if (valorCentavos == null || valorCentavos <= 0) {
        valor.setCustomValidity("Informe o valor da mensalidade.");
        form.reportValidity();
        return false;
      }
      if (!U.numeroWhats(fd.get("whatsapp"))) {
        whats.setCustomValidity("Informe o número com DDD, ex.: (21) 99999-9999.");
        form.reportValidity();
        return false;
      }
      const dia = Math.min(31, Math.max(1, Number(fd.get("diaVencimento")) || 1));
      const id = S.salvarCliente({
        ...(c ? { id: c.id } : {}),
        nome: String(fd.get("nome")).trim().replace(/\s+/g, " "),
        whatsapp: U.soDigitos(fd.get("whatsapp")),
        planoId: fd.get("planoId"),
        valor: valorCentavos,
        diaVencimento: dia,
        inicio: fd.get("inicio"),
        cobrarDesde: fd.get("cobrarDesde") || U.mesAtual(),
        nascimento: fd.get("nascimento") || null,
        objetivo: String(fd.get("objetivo") || "").trim(),
        origem: fd.get("origem") || "",
        obs: String(fd.get("obs") || "").trim(),
      });
      if (novo) {
        ui.recemCriado = id;
        location.hash = `#/cliente/${encodeURIComponent(id)}`;
        toast("Cliente cadastrado");
      } else toast("Alterações salvas");
    },
  });
}

function abrirPagamento(m) {
  if (!m) return;
  const c = S.cliente(m.clienteId);
  const p = S.plano(m.planoId) || S.plano(c?.planoId);
  const hj = U.hoje();
  abrirSheet({
    titulo: "Registrar pagamento",
    corpo: `
      <div class="resumo-cobranca">
        <strong>${esc(c?.nome || "Cliente")}</strong>
        <span>${esc(p?.nome || "")} · ${esc(U.capitalizar(U.mesExtenso(m.competencia)))} · vence ${U.dataBR(m.vencimento)}</span>
      </div>
      <div class="field-row">
        <div class="field"><label for="p-valor">Valor recebido</label><div class="com-prefixo"><span>R$</span><input id="p-valor" name="valor" inputmode="decimal" required value="${U.dinheiroCampo(m.valor)}"></div></div>
        <div class="field"><label for="p-data">Data</label><input id="p-data" name="pagoEm" type="date" required max="${hj}" value="${hj}"></div>
      </div>
      <div class="field">
        <span class="label">Forma de pagamento</span>
        <div class="seg">
          ${[
            ["pix", "pix"],
            ["dinheiro", "cash"],
            ["cartao", "card"],
          ]
            .map(([f, i], k) => `<label><input type="radio" name="forma" value="${f}" ${k === 0 ? "checked" : ""}><span>${ic(i)}${S.FORMAS[f]}</span></label>`)
            .join("")}
        </div>
      </div>`,
    rodape: `<button type="button" class="btn btn-ghost" data-fechar>Voltar</button><button type="submit" class="btn">${ic("check")}<span>Confirmar</span></button>`,
    aoAbrir(form) {
      const valor = $("#p-valor", form);
      valor.addEventListener("input", () => valor.setCustomValidity(""));
    },
    aoEnviar(fd, form) {
      const valorPago = U.lerDinheiro(fd.get("valor"));
      if (valorPago == null || valorPago <= 0) {
        $("#p-valor", form).setCustomValidity("Informe o valor recebido.");
        form.reportValidity();
        return false;
      }
      S.registrarPagamento(m.id, { valorPago, pagoEm: fd.get("pagoEm"), forma: fd.get("forma") });
      toast(`Pagamento de ${U.primeiroNome(c?.nome) || "cliente"} registrado`, { acao: "Desfazer", aoClicar: () => S.desfazerPagamento(m.id) });
    },
  });
}

function abrirMensalidade(m) {
  if (!m) return;
  const c = S.cliente(m.clienteId);
  const p = S.plano(m.planoId) || S.plano(c?.planoId);
  const s = S.situacao(m);
  const emAberto = s === "aberta" || s === "atrasada";
  const link = emAberto ? U.linkWhats(c?.whatsapp, S.mensagemCobranca(m)) : "";
  const atraso = s === "atrasada" ? U.diffDias(m.vencimento, U.hoje()) : 0;

  let botoes = "";
  if (emAberto) {
    botoes = `
      <button type="button" class="btn" data-act="pagar" data-id="${esc(m.id)}">${ic("check")}<span>Registrar pagamento</span></button>
      ${link ? `<a class="btn btn-wa" href="${esc(link)}" target="_blank" rel="noopener">${ic("wa")}<span>Cobrar no WhatsApp</span></a>` : ""}
      <button type="button" class="btn btn-ghost" data-act="editar-cobranca" data-id="${esc(m.id)}">${ic("edit")}<span>Mudar valor ou vencimento</span></button>
      <button type="button" class="btn btn-danger" data-act="cancelar-cobranca" data-id="${esc(m.id)}">${ic("ban")}<span>Cancelar esta cobrança</span></button>`;
  } else if (s === "paga") {
    botoes = `<button type="button" class="btn btn-ghost" data-act="desfazer" data-id="${esc(m.id)}">${ic("undo")}<span>Desfazer pagamento</span></button>`;
  } else {
    botoes = `<button type="button" class="btn btn-ghost" data-act="reabrir-cobranca" data-id="${esc(m.id)}">${ic("undo")}<span>Reabrir cobrança</span></button>`;
  }

  abrirSheet({
    titulo: U.capitalizar(U.mesExtenso(m.competencia)),
    corpo: `
      <div class="perfil-top">
        ${avatar(c, p)}
        <div><strong>${esc(c?.nome || "Cliente excluído")}</strong><span class="perfil-plano">${esc(p?.nome || "")}</span></div>
      </div>
      <dl class="dados">
        <div><dt>Situação</dt><dd>${chipSituacao(s)}</dd></div>
        <div><dt>Valor</dt><dd>${U.brl(m.valor)}</dd></div>
        <div><dt>Vencimento</dt><dd>${U.dataBR(m.vencimento)}${atraso ? `<small class="txt-bad">${plural(atraso, "dia", "dias")} de atraso</small>` : ""}</dd></div>
        ${s === "paga" ? `<div><dt>Pago em</dt><dd>${U.dataBR(m.pagoEm)}<small>${esc(S.FORMAS[m.forma] || "")}</small></dd></div><div><dt>Recebido</dt><dd>${U.brl(S.valorRecebido(m))}</dd></div>` : ""}
      </dl>
      <div class="acoes-lista">${botoes}</div>
      ${c ? `<a class="link" href="#/cliente/${encodeURIComponent(c.id)}" data-fechar-ao-navegar>Ver ficha do cliente</a>` : ""}`,
  });
}

function abrirEditarCobranca(m) {
  if (!m) return;
  abrirSheet({
    titulo: "Mudar cobrança",
    corpo: `
      <p class="hint">Só muda esta mensalidade (${esc(U.mesExtenso(m.competencia))}). Para mudar todo mês, edite o cliente.</p>
      <div class="field-row">
        <div class="field"><label for="e-valor">Valor</label><div class="com-prefixo"><span>R$</span><input id="e-valor" name="valor" inputmode="decimal" required value="${U.dinheiroCampo(m.valor)}"></div></div>
        <div class="field"><label for="e-venc">Vencimento</label><input id="e-venc" name="vencimento" type="date" required value="${esc(m.vencimento)}"></div>
      </div>`,
    rodape: `<button type="button" class="btn btn-ghost" data-fechar>Voltar</button><button type="submit" class="btn">${ic("check")}<span>Salvar</span></button>`,
    aoEnviar(fd, form) {
      const valor = U.lerDinheiro(fd.get("valor"));
      if (valor == null || valor <= 0) {
        $("#e-valor", form).setCustomValidity("Informe o valor.");
        form.reportValidity();
        return false;
      }
      S.editarCobranca(m.id, { valor, vencimento: fd.get("vencimento") });
      toast("Cobrança atualizada");
    },
  });
}

function abrirSaidaCliente(c, tipo) {
  const pausar = tipo === "pausar";
  const abertas = S.abertasDoCliente(c.id);
  abrirSheet({
    titulo: pausar ? "Pausar cliente" : "Cancelar plano",
    corpo: `
      <p>${
        pausar
          ? `<strong>${esc(c.nome)}</strong> deixa de receber mensalidades novas até ser reativado. O histórico fica guardado.`
          : `<strong>${esc(c.nome)}</strong> sai da lista de ativos e não recebe mais mensalidades. O histórico fica guardado e dá para reativar depois.`
      }</p>
      <div class="field"><label for="s-motivo">Motivo (opcional)</label><input id="s-motivo" name="motivo" list="lista-motivos" placeholder="${pausar ? "Ex.: Viagem" : "Ex.: Mudou de cidade"}">${datalist("lista-motivos", S.MOTIVOS_SAIDA)}</div>
      ${
        abertas.length
          ? `<label class="check"><input type="checkbox" name="cancelarCobrancas" ${pausar ? "" : "checked"}><span>Cancelar também ${abertas.length === 1 ? "a cobrança em aberto" : `as ${abertas.length} cobranças em aberto`} (${abertas.map((m) => U.mesCurto(m.competencia)).join(", ")})</span></label>`
          : ""
      }`,
    rodape: `<button type="button" class="btn btn-ghost" data-fechar>Voltar</button><button type="submit" class="btn ${pausar ? "btn-warn" : "btn-danger"}">${ic(pausar ? "pause" : "ban")}<span>${pausar ? "Pausar" : "Cancelar plano"}</span></button>`,
    aoEnviar(fd) {
      const opcoes = { motivo: String(fd.get("motivo") || "").trim(), cancelarCobrancas: fd.get("cancelarCobrancas") === "on" };
      if (pausar) S.pausarCliente(c.id, opcoes);
      else S.cancelarCliente(c.id, opcoes);
      toast(pausar ? "Cliente pausado" : "Plano cancelado");
    },
  });
}

function abrirReativar(c) {
  abrirSheet({
    titulo: "Reativar cliente",
    corpo: `
      <p><strong>${esc(c.nome)}</strong> volta para a lista de ativos com o plano ${esc(S.plano(c.planoId)?.nome || "")} (${U.brl(c.valor)}/mês). Para mudar plano ou valor, edite o cliente depois.</p>
      <div class="field"><label for="r-mes">Primeira mensalidade</label><select id="r-mes" name="cobrarDesde">${opcoesMeses(U.mesAtual(), 0, 2)}</select></div>`,
    rodape: `<button type="button" class="btn btn-ghost" data-fechar>Voltar</button><button type="submit" class="btn">${ic("play")}<span>Reativar</span></button>`,
    aoEnviar(fd) {
      S.reativarCliente(c.id, { cobrarDesde: fd.get("cobrarDesde") });
      toast("Cliente reativado");
    },
  });
}

function abrirFormPlano(p) {
  const novo = !p;
  const v = p || { nome: "", tipo: "online", preco: null, precoVariavel: false, medalha: "azul", ativo: true };
  const uso = p ? [...S.state.clientes.values()].filter((c) => c.planoId === p.id).length : 0;
  abrirSheet({
    titulo: novo ? "Novo plano" : "Editar plano",
    corpo: `
      <div class="field"><label for="pl-nome">Nome do plano</label><input id="pl-nome" name="nome" required value="${esc(v.nome)}" placeholder="Ex.: Consultoria Trimestral"></div>
      <div class="field-row">
        <div class="field"><label for="pl-tipo">Tipo</label><select id="pl-tipo" name="tipo"><option value="online" ${v.tipo === "online" ? "selected" : ""}>Consultoria online</option><option value="presencial" ${v.tipo === "presencial" ? "selected" : ""}>Presencial</option></select></div>
        <div class="field"><label for="pl-medalha">Cor</label><select id="pl-medalha" name="medalha">${Object.entries(MEDALHAS).map(([k, t]) => `<option value="${k}" ${v.medalha === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      </div>
      <label class="check"><input type="checkbox" name="precoVariavel" id="pl-variavel" ${v.precoVariavel ? "checked" : ""}><span>Valor combinado com cada aluno</span></label>
      <div class="field" id="pl-campo-preco"><label for="pl-preco">Preço por mês</label><div class="com-prefixo"><span>R$</span><input id="pl-preco" name="preco" inputmode="decimal" value="${esc(U.dinheiroCampo(v.preco))}" placeholder="0,00"></div>
        ${novo ? "" : `<p class="hint">Mudar o preço não altera quem já é aluno: o valor de cada um fica na ficha do cliente.</p>`}</div>
      <label class="check"><input type="checkbox" name="ativo" ${v.ativo !== false ? "checked" : ""}><span>Disponível para novos clientes</span></label>
      ${!novo && uso ? `<p class="hint">${plural(uso, "cliente usa", "clientes usam")} este plano, então ele não pode ser excluído. Para tirar da lista, desmarque “Disponível”.</p>` : ""}`,
    rodape: `${!novo && !uso ? `<button type="button" class="btn btn-danger esq" data-act="excluir-plano" data-id="${esc(p.id)}">${ic("trash")}<span>Excluir</span></button>` : `<button type="button" class="btn btn-ghost" data-fechar>Voltar</button>`}
      <button type="submit" class="btn">${ic("check")}<span>Salvar</span></button>`,
    aoAbrir(form) {
      const variavel = $("#pl-variavel", form);
      const campo = $("#pl-campo-preco", form);
      const preco = $("#pl-preco", form);
      const atualizar = () => {
        campo.hidden = variavel.checked;
        preco.required = !variavel.checked;
      };
      variavel.addEventListener("change", atualizar);
      preco.addEventListener("input", () => preco.setCustomValidity(""));
      atualizar();
    },
    aoEnviar(fd, form) {
      const variavel = fd.get("precoVariavel") === "on";
      const preco = variavel ? null : U.lerDinheiro(fd.get("preco"));
      if (!variavel && (preco == null || preco <= 0)) {
        $("#pl-preco", form).setCustomValidity("Informe o preço do plano.");
        form.reportValidity();
        return false;
      }
      S.salvarPlano({
        ...(p ? { id: p.id } : {}),
        nome: String(fd.get("nome")).trim(),
        tipo: fd.get("tipo"),
        medalha: fd.get("medalha"),
        precoVariavel: variavel,
        preco,
        ativo: fd.get("ativo") === "on",
      });
      toast(novo ? "Plano criado" : "Plano salvo");
    },
  });
}

function baixarBackup() {
  const dados = S.backup();
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gestao-claudio-paiva-${U.hoje()}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast("Backup baixado");
}

/* =========================================================
   Ações (cliques em elementos com data-act)
   ========================================================= */
const ACOES = {
  "mes-ant": () => {
    ui.mes = U.somaMeses(ui.mes, -1);
    render();
  },
  "mes-prox": () => {
    ui.mes = U.somaMeses(ui.mes, 1);
    render();
  },
  "mes-hoje": () => {
    ui.mes = U.mesAtual();
    render();
  },
  "filtro-clientes": ({ valor }) => {
    ui.clientes.status = valor;
    render();
  },
  "filtro-cobrancas": ({ valor }) => {
    ui.cobrancas = valor;
    render();
  },
  "novo-cliente": () => abrirFormCliente(),
  "editar-cliente": ({ id }) => abrirFormCliente(S.cliente(id)),
  "excluir-cliente": async ({ id }) => {
    const c = S.cliente(id);
    if (!c) return;
    const n = S.mensalidadesDoCliente(id).length;
    const ok = await confirmar({
      titulo: "Excluir cliente",
      texto: `Apagar <strong>${esc(c.nome)}</strong> e ${plural(n, "mensalidade", "mensalidades")} do histórico? Não dá para desfazer. Se a pessoa só parou de treinar, use “Cancelar plano”, que guarda o histórico.`,
      botao: "Excluir de vez",
      tom: "btn-danger",
    });
    if (!ok) return;
    S.excluirCliente(id);
    location.hash = "#/clientes";
    toast("Cliente excluído");
  },
  pausar: ({ id }) => S.cliente(id) && abrirSaidaCliente(S.cliente(id), "pausar"),
  "cancelar-cliente": ({ id }) => S.cliente(id) && abrirSaidaCliente(S.cliente(id), "cancelar"),
  reativar: ({ id }) => S.cliente(id) && abrirReativar(S.cliente(id)),
  pagar: ({ id }) => abrirPagamento(S.mensalidade(id)),
  mensalidade: ({ id }) => abrirMensalidade(S.mensalidade(id)),
  "editar-cobranca": ({ id }) => abrirEditarCobranca(S.mensalidade(id)),
  desfazer: ({ id }) => {
    S.desfazerPagamento(id);
    fecharSheet();
    toast("Pagamento desfeito");
  },
  "cancelar-cobranca": async ({ id }) => {
    const m = S.mensalidade(id);
    if (!m) return;
    const ok = await confirmar({
      titulo: "Cancelar cobrança",
      texto: `A mensalidade de ${esc(U.mesExtenso(m.competencia))} de <strong>${esc(S.cliente(m.clienteId)?.nome || "")}</strong> deixa de ser cobrada e sai das contas do mês. Dá para reabrir depois.`,
      botao: "Cancelar cobrança",
      tom: "btn-danger",
    });
    if (!ok) return;
    S.cancelarCobranca(id);
    toast("Cobrança cancelada", { acao: "Desfazer", aoClicar: () => S.reabrirCobranca(id) });
  },
  "reabrir-cobranca": ({ id }) => {
    S.reabrirCobranca(id);
    fecharSheet();
    toast("Cobrança reaberta");
  },
  "novo-plano": () => abrirFormPlano(),
  "editar-plano": ({ id }) => abrirFormPlano(S.plano(id)),
  "excluir-plano": async ({ id }) => {
    const p = S.plano(id);
    if (!p) return;
    const ok = await confirmar({ titulo: "Excluir plano", texto: `Excluir o plano <strong>${esc(p.nome)}</strong>?`, botao: "Excluir", tom: "btn-danger" });
    if (!ok) return;
    S.excluirPlano(id);
    toast("Plano excluído");
  },
  backup: () => baixarBackup(),
  entrar: async () => {
    const erro = $("#login-erro");
    if (erro) erro.textContent = "";
    try {
      await S.entrar();
    } catch (e) {
      if (erro) erro.textContent = mensagemErroLogin(e);
    }
  },
  sair: () => S.sair(),
  "demo-restaurar": async () => {
    const ok = await confirmar({ titulo: "Restaurar exemplo", texto: "Trocar tudo o que está aqui pelos dados de exemplo?", botao: "Restaurar" });
    if (!ok) return;
    S.restaurarExemplo();
    toast("Dados de exemplo restaurados");
  },
  "demo-zerar": async () => {
    const ok = await confirmar({
      titulo: "Começar do zero",
      texto: "Apagar os clientes e mensalidades de exemplo e ficar só com os 3 planos? (Isso afeta só este navegador.)",
      botao: "Apagar exemplo",
      tom: "btn-danger",
    });
    if (!ok) return;
    S.comecarDoZero();
    toast("Pronto, tudo zerado");
  },
};

document.addEventListener("click", (e) => {
  const alvo = e.target.closest("[data-act]");
  if (alvo) {
    const fn = ACOES[alvo.dataset.act];
    if (fn) {
      e.preventDefault();
      fn(alvo.dataset, alvo);
    }
    return;
  }
  if (e.target.closest("[data-fechar], [data-fechar-ao-navegar]")) {
    if (e.target.closest("[data-fechar]")) e.preventDefault();
    fecharSheet();
  }
});

/* =========================================================
   Início
   ========================================================= */
function iniciarEventos() {
  const dlg = $("#sheet");
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) fecharSheet(); // toque fora da janela
  });
  dlg.addEventListener("close", () => {
    const atual = sheetAtual;
    sheetAtual = null;
    atual?.aoFechar?.();
  });
  window.addEventListener("hashchange", () => {
    fecharSheet();
    render();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      S.reverificar();
      render(true);
    }
  });
  S.aoMudar(() => render(true));
  S.quandoErroGravar((e) => {
    console.error(e);
    const semPermissao = e?.code === "permission-denied";
    toast(semPermissao ? "Sem permissão para salvar. Confira o e-mail em firestore.rules." : "Não foi possível salvar. Confira a internet e tente de novo.", { erro: true });
  });
}

async function iniciar() {
  iniciarEventos();
  if (S.modoDemo()) {
    await S.iniciarDemo();
    montarShell();
    render();
    return;
  }
  try {
    await S.iniciarFirebase((estado) => {
      if (estado.tipo === "ok") {
        montarShell();
        render();
      } else telaLogin(estado);
    });
  } catch (e) {
    console.error(e);
    telaFalha("Não foi possível carregar o sistema. Confira a internet e tente de novo.");
  }
}

iniciar();
