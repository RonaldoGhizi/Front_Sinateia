import type { Decimal } from "./api";

const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NUMERO = new Intl.NumberFormat("pt-BR");

export function reais(valor: Decimal | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  return MOEDA.format(Number(valor));
}

export function numero(valor: number): string {
  return NUMERO.format(valor);
}

/** "17.50" → "17,5%" */
export function percentual(valor: Decimal | number): string {
  return `${NUMERO.format(Number(valor))}%`;
}

/** "2030-07-31" → "31/07/2030" */
export function data(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** "2026-11-03T06:05:00Z" → "03/11/2026 03:05", no horário de Brasília. */
export function dataHora(iso: string | null | undefined, fuso = "America/Sao_Paulo"): string {
  if (!iso) return "—";
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: fuso,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${partes.day}/${partes.month}/${partes.year} ${partes.hour}:${partes.minute}`;
}

/** Registro da Anvisa como ela publica: 1.6993.0008 (produto) ou 1.0068.1174.001-1 (apresentação). */
export function registroAnvisa(numero: string): string {
  const d = numero.replace(/\D/g, "");
  if (d.length === 9) return `${d[0]}.${d.slice(1, 5)}.${d.slice(5)}`;
  if (d.length === 13) return `${d[0]}.${d.slice(1, 5)}.${d.slice(5, 9)}.${d.slice(9, 12)}-${d[12]}`;
  return numero;
}

/** 18 → "1 ano e 6 meses" */
export function idade(meses: number): string {
  if (meses < 1) return "menos de 1 mês";
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes = [];
  if (anos) partes.push(`${anos} ${anos === 1 ? "ano" : "anos"}`);
  if (resto) partes.push(`${resto} ${resto === 1 ? "mês" : "meses"}`);
  return partes.join(" e ");
}

/** Faixa de idade de um procedimento do SIGTAP. */
export function faixaDeIdade(minima: number | null, maxima: number | null): string {
  const min = minima ?? 0;
  if (!min && maxima === null) return "Sem limite de idade";
  if (maxima === null) return `A partir de ${idade(min)}`;
  if (!min) return `Até ${idade(maxima)}`;
  return `${idade(min)} a ${idade(maxima)}`;
}

/** "NUSINERSENA SÓDICA" → "Nusinersena sódica" */
export function frase(texto: string | null | undefined): string {
  if (!texto) return "";
  const minusculo = texto.toLocaleLowerCase("pt-BR");
  return minusculo.charAt(0).toLocaleUpperCase("pt-BR") + minusculo.slice(1);
}

export const UFS: [string, string][] = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"],
  ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"],
  ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"],
  ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"],
  ["SE", "Sergipe"], ["TO", "Tocantins"],
];

/** Estados com Zona Franca de Manaus ou área de livre comércio (preços ALC da CMED). */
export const UFS_ALC = new Set(["AC", "AM", "AP", "RO", "RR"]);

export function nomeDaUf(uf: string): string {
  return UFS.find(([sigla]) => sigla === uf)?.[1] ?? uf;
}

/** Onde o SUS entrega, pelo subgrupo do SIGTAP. */
export function componente(nome: string | null): string {
  if (!nome) return "—";
  if (/especializado/i.test(nome)) return "Farmácia de alto custo (CEAF)";
  if (/hospitalar/i.test(nome)) return "Hospital";
  return nome;
}
