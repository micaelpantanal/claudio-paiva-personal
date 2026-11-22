/* Utilidades da gestão: texto, dinheiro, datas e telefone. */

/* ---------- Texto ---------- */
export const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const normalizar = (s) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

export const primeiroNome = (nome) => String(nome ?? "").trim().split(/\s+/)[0] || "";

export function iniciais(nome) {
  const partes = String(nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (partes[0][0] + ultima).toUpperCase();
}

export function novoId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  return Array.from({ length: 20 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
}

/** Troca {variavel} pelo valor. Linhas com variável vazia (ex.: sem chave Pix) somem da mensagem. */
export function preencher(modelo, vars) {
  return String(modelo ?? "")
    .split("\n")
    .filter((linha) => !(linha.match(/\{(\w+)\}/g) || []).some((t) => t.slice(1, -1) in vars && !vars[t.slice(1, -1)]))
    .join("\n")
    .replace(/\{(\w+)\}/g, (t, k) => (k in vars ? vars[k] : t))
    .trim();
}

/* ---------- Dinheiro (sempre guardado em centavos, número inteiro) ---------- */
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const brl = (centavos) => BRL.format((Number(centavos) || 0) / 100);

/** "140" → 14000 · "140,50" → 14050 · "1.200,00" → 120000 · "" → null */
export function lerDinheiro(texto) {
  let s = String(texto ?? "").trim().replace(/[^\d,.]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export const dinheiroCampo = (centavos) => (centavos == null ? "" : (centavos / 100).toFixed(2).replace(".", ","));

/* ---------- Datas (texto "AAAA-MM-DD" e meses "AAAA-MM", no horário do aparelho) ---------- */
const pad = (n) => String(n).padStart(2, "0");
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hoje = () => isoDe(new Date());
export const mesDe = (iso) => String(iso ?? "").slice(0, 7);
export const mesAtual = () => mesDe(hoje());
const dataDe = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d || 1);
};

export function somaMeses(ym, n) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Meses de `de` até `ate` (inclusive), no máximo os últimos `limite`. */
export function mesesEntre(de, ate, limite = 36) {
  if (!de || !ate || de > ate) return [];
  const inicio = somaMeses(ate, -(limite - 1));
  const out = [];
  for (let m = de > inicio ? de : inicio; m <= ate; m = somaMeses(m, 1)) out.push(m);
  return out;
}

export const diasNoMes = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

/** Vencimento no mês: dia 31 em fevereiro vira o último dia de fevereiro. */
export const vencimentoDe = (ym, dia) => `${ym}-${pad(Math.min(Math.max(1, Number(dia) || 1), diasNoMes(ym)))}`;

export const somaDias = (iso, n) => {
  const d = dataDe(iso);
  d.setDate(d.getDate() + n);
  return isoDe(d);
};

export const diffDias = (de, ate) => {
  const utc = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(ate) - utc(de)) / 86400000);
};

export const nomeMes = (ym) => MESES[Number(String(ym).slice(5, 7)) - 1] ?? "";
export const mesExtenso = (ym) => `${nomeMes(ym)} de ${String(ym).slice(0, 4)}`;
export const mesCurto = (ym) => `${nomeMes(ym).slice(0, 3)}/${String(ym).slice(2, 4)}`;
export const dataBR = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
export const diaMes = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");
export const dataExtensa = (iso) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(dataDe(iso));

export function idade(nascimento) {
  if (!nascimento) return null;
  const [y, m, d] = nascimento.split("-").map(Number);
  const [hy, hm, hd] = hoje().split("-").map(Number);
  return hy - y - (hm < m || (hm === m && hd < d) ? 1 : 0);
}

/** "1 ano e 3 meses", "5 meses", "12 dias" */
export function tempoDesde(iso) {
  if (!iso) return "";
  const hj = hoje();
  if (iso > hj) return `começa em ${dataBR(iso)}`;
  const [y1, m1, d1] = iso.split("-").map(Number);
  const [y2, m2, d2] = hj.split("-").map(Number);
  let meses = (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
  if (meses < 1) {
    const dias = diffDias(iso, hj);
    return dias === 0 ? "começou hoje" : `${dias} dia${dias > 1 ? "s" : ""}`;
  }
  const anos = Math.floor(meses / 12);
  meses %= 12;
  const partes = [];
  if (anos) partes.push(`${anos} ano${anos > 1 ? "s" : ""}`);
  if (meses) partes.push(`${meses} ${meses > 1 ? "meses" : "mês"}`);
  return partes.join(" e ");
}

/* ---------- Telefone e WhatsApp ---------- */
export const soDigitos = (s) => String(s ?? "").replace(/\D/g, "");

/** Número no formato do wa.me: 55 + DDD + número. Vazio se não der para montar. */
export function numeroWhats(tel) {
  let d = soDigitos(tel);
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d.length >= 12 && d.length <= 13 ? d : "";
}

export function telefoneBR(tel) {
  let d = soDigitos(tel);
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return String(tel ?? "");
}

export function linkWhats(tel, mensagem) {
  const n = numeroWhats(tel);
  if (!n) return "";
  return `https://wa.me/${n}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ""}`;
}
