// Regras que o front aplica sobre as respostas da API para montar o relatório.
import type { Apresentacao, Medicamento, ProcedimentoSus, Veredito } from "./api";
import { faixaDeIdade, idade } from "./formato";

export type TipoDeCompra = "judicial" | "publica" | "privada";
export type CampoDePreco = "judicial" | "compra_publica" | "fabrica" | "consumidor";

export const TIPOS_DE_COMPRA: { valor: TipoDeCompra; rotulo: string; teto: string; campo: CampoDePreco }[] = [
  { valor: "judicial", rotulo: "Ação judicial", teto: "PMVG", campo: "judicial" },
  { valor: "publica", rotulo: "Compra pública", teto: "PMVG ou PF", campo: "compra_publica" },
  { valor: "privada", rotulo: "Hospital ou clínica", teto: "PF", campo: "fabrica" },
];

export function tipoDeCompra(valor: string | null | undefined) {
  return TIPOS_DE_COMPRA.find((t) => t.valor === valor) ?? TIPOS_DE_COMPRA[0];
}

export function procedimentosDoCid(procedimentos: ProcedimentoSus[], cid: string): ProcedimentoSus[] {
  return procedimentos.filter((p) => p.cids.some((c) => c.codigo === cid));
}

export function idadeAtende(procedimento: ProcedimentoSus, meses: number): boolean {
  const minima = procedimento.idade_minima_meses ?? 0;
  const maxima = procedimento.idade_maxima_meses;
  return meses >= minima && (maxima === null || meses <= maxima);
}

export type EstadoSus = "fornece" | "fora_da_idade" | "nao_fornece" | "incorporado" | "desconhecido" | "sem_cid";

export interface SituacaoSus {
  estado: EstadoSus;
  titulo: string;
  detalhe: string;
}

const FORNECE: Veredito[] = ["fornece_para_o_cid", "fornece_outro_cid", "fornece"];

/**
 * Se o SUS fornece o medicamento para o CID e, quando informada, para a idade do paciente.
 * O veredito vem da API (RENAME, SIGTAP, PCDT e Conitec); a idade é conferida aqui, pelo SIGTAP.
 */
export function situacaoSus(medicamento: Medicamento, cid: string | null, meses: number | null): SituacaoSus {
  const cobertura = medicamento.cobertura_sus;
  const veredito = cobertura.veredito;
  const primeira = cobertura.observacoes[0];
  if (!cid && FORNECE.includes(veredito)) {
    return { estado: "sem_cid", titulo: "Fornece · informe o CID", detalhe: `${cobertura.resumo} Informe a doença para saber se vale para o paciente.` };
  }
  switch (veredito) {
    case "fornece_outro_cid":
      return { estado: "nao_fornece", titulo: `Não fornece para ${cid}`, detalhe: "O SUS fornece este medicamento para outras doenças: para este paciente seria uso fora do protocolo." };
    case "fornece":
      return { estado: "fornece", titulo: "Fornece", detalhe: primeira ?? cobertura.resumo };
    case "incorporado":
      return { estado: "incorporado", titulo: "Incorporado, ainda chegando", detalhe: primeira ?? cobertura.resumo };
    case "nao_incorporado":
      return { estado: "nao_fornece", titulo: "Recusado pela Conitec", detalhe: primeira ?? cobertura.resumo };
    case "excluido":
      return { estado: "nao_fornece", titulo: "Excluído do SUS", detalhe: primeira ?? cobertura.resumo };
    case "nao_consta":
      return { estado: "nao_fornece", titulo: "Não está no SUS", detalhe: cobertura.resumo };
    case "indeterminado":
      return { estado: "desconhecido", titulo: "Não dá para saber", detalhe: primeira ?? cobertura.resumo };
    case "fornece_para_o_cid":
      break;
  }
  const doCid = procedimentosDoCid(medicamento.sus ?? [], cid ?? "");
  if (!doCid.length) {
    // Liberado pelo PCDT, sem faixa de idade no SIGTAP para conferir.
    return { estado: "fornece", titulo: `Fornece para ${cid}`, detalhe: primeira ?? cobertura.resumo };
  }
  if (meses === null) {
    return {
      estado: "fornece",
      titulo: `Fornece para ${cid}`,
      detalhe: `Idade liberada: ${faixas(doCid)}. Informe a idade para conferir.`,
    };
  }
  if (doCid.some((p) => idadeAtende(p, meses))) {
    return { estado: "fornece", titulo: `Fornece para ${cid}`, detalhe: `Paciente de ${idade(meses)} está na faixa liberada.` };
  }
  return {
    estado: "fora_da_idade",
    titulo: "Não fornece para esta idade",
    detalhe: `O SIGTAP libera só para ${faixas(doCid).toLocaleLowerCase("pt-BR")}; o paciente tem ${idade(meses)}.`,
  };
}

function faixas(procedimentos: ProcedimentoSus[]): string {
  const textos = new Set(procedimentos.map((p) => faixaDeIdade(p.idade_minima_meses, p.idade_maxima_meses)));
  return [...textos].join(" ou ") || "sem informação";
}

export interface Caminho {
  titulo: string;
  detalhe: string;
  tema: "6" | "500" | null;
}

/** O caminho provável, pelas teses do STF. Orienta o comercial; quem decide é o advogado. */
export function caminho(medicamento: Medicamento, sus: SituacaoSus): Caminho {
  if (!medicamento.valido) {
    return {
      titulo: "Sem registro válido · Tema 500",
      detalhe: "Registro vencido ou cancelado: a ação segue as regras de medicamento sem registro, contra a União.",
      tema: "500",
    };
  }
  switch (sus.estado) {
    case "fornece":
      return { titulo: "Pedir ao SUS", detalhe: "O paciente retira pelo SUS; ação judicial só se o pedido for negado.", tema: null };
    case "fora_da_idade":
    case "nao_fornece":
      return { titulo: "Ação judicial · Tema 6", detalhe: "Registrado na Anvisa e não fornecido pelo SUS para este caso.", tema: "6" };
    case "incorporado":
      return { titulo: "Pedir ao SUS", detalhe: "O SUS já tem de fornecer; se o prazo de 180 dias venceu e o pedido for negado, cabe ação.", tema: null };
    case "desconhecido":
      return { titulo: "Confirmar cobertura do SUS", detalhe: "Antes de definir o caminho, carregue as fontes que faltam (RENAME, Conitec).", tema: null };
    case "sem_cid":
      return { titulo: "Informe o CID", detalhe: "O caminho depende de o SUS fornecer para a doença.", tema: null };
  }
}

/** Menor e maior teto entre as apresentações, para o tipo de compra. */
export function faixaDoTeto(apresentacoes: Apresentacao[], campo: CampoDePreco): { minimo: number; maximo: number } | null {
  const valores = apresentacoes
    .map((a) => a.preco_maximo?.[campo])
    .filter((v): v is string => Boolean(v))
    .map(Number);
  if (!valores.length) return null;
  return { minimo: Math.min(...valores), maximo: Math.max(...valores) };
}
