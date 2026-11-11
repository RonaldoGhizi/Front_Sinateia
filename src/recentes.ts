// Consultas recentes guardadas neste navegador. Não vão para o servidor.

export interface Consulta {
  registro: string;
  nome: string;
  principio: string | null;
  cid: string | null;
  uf: string | null;
  idadeMeses: number | null;
  tipo: string;
  alc: boolean;
  quando: string;
}

const CHAVE = "sinateia.consultas";
const MAXIMO = 8;

export function lerConsultas(): Consulta[] {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "[]");
    return Array.isArray(salvo) ? salvo : [];
  } catch {
    return [];
  }
}

export function guardarConsulta(consulta: Consulta): void {
  const mesma = (c: Consulta) =>
    c.registro === consulta.registro && c.cid === consulta.cid && c.uf === consulta.uf && c.idadeMeses === consulta.idadeMeses;
  try {
    localStorage.setItem(CHAVE, JSON.stringify([consulta, ...lerConsultas().filter((c) => !mesma(c))].slice(0, MAXIMO)));
  } catch {
    // Navegador sem armazenamento (janela anônima): a consulta só não fica na lista.
  }
}

/** Endereço do relatório com os filtros da consulta. */
export function enderecoDoRelatorio(c: Pick<Consulta, "registro" | "cid" | "uf" | "idadeMeses" | "tipo" | "alc">): string {
  const parametros = new URLSearchParams();
  if (c.cid) parametros.set("cid", c.cid);
  if (c.uf) parametros.set("uf", c.uf);
  if (c.idadeMeses !== null) parametros.set("idade", String(c.idadeMeses));
  if (c.tipo) parametros.set("tipo", c.tipo);
  if (c.alc) parametros.set("alc", "1");
  return `/relatorio/${encodeURIComponent(c.registro)}?${parametros}`;
}
