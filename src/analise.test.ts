import { describe, expect, it } from "vitest";
import type { Cid, CoberturaSus, Medicamento, ProcedimentoSus, Veredito } from "./api";
import { caminho, faixaDoTeto, idadeAtende, situacaoSus } from "./analise";

const G120 = { codigo: "G12.0", nome: "AME tipo I" };

function procedimento(minima: number | null, maxima: number | null, cids: Cid[] = [G120]): ProcedimentoSus {
  return {
    codigo: "06.03.09.001-0", nome: "ONASEMNOGENO", componente: null, forma_organizacao: null, sexo: null,
    idade_minima_meses: minima, idade_maxima_meses: maxima, valor_sigtap: null, cids,
  };
}

function medicamento(parcial: Partial<Medicamento>): Medicamento {
  return {
    numero_registro: "100680174", nome_produto: "ZOLGENSMA", principio_ativo: "ONASEMNOGENO ABEPARVOVEQUE",
    empresa: "NOVARTIS", situacao: "VÁLIDO", valido: true, vencimento: null, categoria_regulatoria: null,
    classe_terapeutica: null, apresentacoes: [], sus: [procedimento(0, 6)], fornecido_pelo_sus_para_o_cid: true,
    observacoes_sus: [], cobertura_sus: cobertura("fornece_para_o_cid"), ...parcial,
  };
}

function cobertura(veredito: Veredito, observacoes: string[] = []): CoberturaSus {
  return {
    veredito, resumo: `Resumo de ${veredito}.`, rename: [], pcdt: [], conitec: [], fontes_consultadas: [],
    fontes_ausentes: [], observacoes,
  };
}

describe("idadeAtende", () => {
  it("respeita a faixa do SIGTAP, sem teto quando a máxima é nula", () => {
    expect(idadeAtende(procedimento(0, 6), 6)).toBe(true);
    expect(idadeAtende(procedimento(0, 6), 7)).toBe(false);
    expect(idadeAtende(procedimento(2, null), 1)).toBe(false);
    expect(idadeAtende(procedimento(2, null), 900)).toBe(true);
  });
});

describe("situacaoSus e caminho", () => {
  it("fora da faixa de idade leva ao Tema 6", () => {
    const m = medicamento({});
    const sus = situacaoSus(m, "G12.0", 18);
    expect(sus.estado).toBe("fora_da_idade");
    expect(sus.detalhe).toContain("1 ano e 6 meses");
    expect(caminho(m, sus).tema).toBe("6");
  });

  it("dentro da faixa, o SUS fornece", () => {
    const m = medicamento({});
    const sus = situacaoSus(m, "G12.0", 3);
    expect(sus.estado).toBe("fornece");
    expect(caminho(m, sus).tema).toBeNull();
  });

  it("sem idade, confia no CID e pede a idade", () => {
    const sus = situacaoSus(medicamento({}), "G12.0", null);
    expect(sus.estado).toBe("fornece");
    expect(sus.detalhe).toContain("Até 6 meses");
  });

  it("só olha os procedimentos do CID consultado", () => {
    const m = medicamento({ sus: [procedimento(0, 6), procedimento(0, null, [{ codigo: "G12.1", nome: null }])] });
    expect(situacaoSus(m, "G12.0", 18).estado).toBe("fora_da_idade");
  });

  it("nulo na API vira 'não dá para saber' com a observação", () => {
    const m = medicamento({ sus: null, cobertura_sus: cobertura("indeterminado", ["Sem princípio ativo."]) });
    const sus = situacaoSus(m, "G12.0", 18);
    expect(sus).toMatchObject({ estado: "desconhecido", detalhe: "Sem princípio ativo." });
    expect(caminho(m, sus).tema).toBeNull();
  });

  it("recusa da Conitec leva ao Tema 6 com a decisão no detalhe", () => {
    const m = medicamento({ sus: [], cobertura_sus: cobertura("nao_incorporado", ["Decisão da Conitec em 15/03/2025."]) });
    const sus = situacaoSus(m, "G12.0", null);
    expect(sus).toMatchObject({ estado: "nao_fornece", titulo: "Recusado pela Conitec", detalhe: "Decisão da Conitec em 15/03/2025." });
    expect(caminho(m, sus).tema).toBe("6");
  });

  it("fornecido para outro CID é uso fora do protocolo", () => {
    const m = medicamento({ cobertura_sus: cobertura("fornece_outro_cid") });
    expect(situacaoSus(m, "M45", null)).toMatchObject({ estado: "nao_fornece", titulo: "Não fornece para M45" });
  });

  it("componente básico fornece sem lista de CID", () => {
    const m = medicamento({ sus: [], cobertura_sus: cobertura("fornece", ["Na RENAME: Componente Básico."]) });
    const sus = situacaoSus(m, "I10", 600);
    expect(sus).toMatchObject({ estado: "fornece", detalhe: "Na RENAME: Componente Básico." });
    expect(caminho(m, sus).tema).toBeNull();
  });

  it("liberado só pelo PCDT fornece sem conferir idade", () => {
    const m = medicamento({ sus: [], cobertura_sus: cobertura("fornece_para_o_cid") });
    expect(situacaoSus(m, "E11", 600).estado).toBe("fornece");
  });

  it("incorporado recentemente pede ao SUS", () => {
    const m = medicamento({ sus: [], cobertura_sus: cobertura("incorporado") });
    const sus = situacaoSus(m, "G12.0", null);
    expect(sus.estado).toBe("incorporado");
    expect(caminho(m, sus).titulo).toBe("Pedir ao SUS");
  });

  it("sem CID, diz que fornece e pede a doença", () => {
    expect(situacaoSus(medicamento({}), null, null).estado).toBe("sem_cid");
  });

  it("registro vencido vai para o Tema 500", () => {
    const m = medicamento({ valido: false, fornecido_pelo_sus_para_o_cid: false });
    expect(caminho(m, situacaoSus(m, "G12.0", 18)).tema).toBe("500");
  });
});

describe("faixaDoTeto", () => {
  it("pega o menor e o maior teto e ignora apresentações sem preço", () => {
    const precos = (judicial: string | null) =>
      ({ preco_maximo: { judicial } }) as unknown as Medicamento["apresentacoes"][number];
    expect(faixaDoTeto([precos("240000.00"), precos(null), precos("100.50")], "judicial")).toEqual({ minimo: 100.5, maximo: 240000 });
    expect(faixaDoTeto([precos(null)], "judicial")).toBeNull();
  });
});
