import { describe, expect, it } from "vitest";
import { componente, data, dataHora, faixaDeIdade, frase, idade, percentual, reais, registroAnvisa } from "./formato";

describe("formato", () => {
  it("formata reais, percentuais e datas no padrão brasileiro", () => {
    expect(reais("8568660.89").replace(/\s/g, " ")).toBe("R$ 8.568.660,89");
    expect(reais(null)).toBe("—");
    expect(percentual("17.50")).toBe("17,5%");
    expect(data("2030-07-31")).toBe("31/07/2030");
    expect(dataHora("2026-11-03T06:05:00Z")).toBe("03/11/2026 03:05");
    expect(dataHora("2026-11-03T06:05:00+00:00", "UTC")).toBe("03/11/2026 06:05");
    expect(dataHora(null)).toBe("—");
  });

  it("formata o número de registro da Anvisa", () => {
    expect(registroAnvisa("169930008")).toBe("1.6993.0008");
    expect(registroAnvisa("1000000010017")).toBe("1.0000.0001.001-7");
    expect(registroAnvisa("abc")).toBe("abc");
  });

  it("escreve idades e faixas do SIGTAP", () => {
    expect(idade(18)).toBe("1 ano e 6 meses");
    expect(idade(96)).toBe("8 anos");
    expect(idade(0)).toBe("menos de 1 mês");
    expect(faixaDeIdade(0, null)).toBe("Sem limite de idade");
    expect(faixaDeIdade(0, 6)).toBe("Até 6 meses");
    expect(faixaDeIdade(2, null)).toBe("A partir de 2 meses");
    expect(faixaDeIdade(72, 126)).toBe("6 anos a 10 anos e 6 meses");
  });

  it("deixa nomes em maiúsculas legíveis e traduz o componente do SUS", () => {
    expect(frase("NUSINERSENA SÓDICA")).toBe("Nusinersena sódica");
    expect(componente("Componente especializado da assistência farmacêutica")).toBe("Farmácia de alto custo (CEAF)");
  });
});
