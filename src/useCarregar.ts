import { useEffect, useState } from "react";
import { ErroApi } from "./api";

export type Carga<T> = { estado: "carregando" } | { estado: "erro"; mensagem: string } | { estado: "pronto"; dados: T };

/** Chama a API quando as dependências mudam e cancela a chamada anterior. */
export function useCarregar<T>(buscar: ((sinal: AbortSignal) => Promise<T>) | null, dependencias: unknown[]): Carga<T> | null {
  const [carga, setCarga] = useState<Carga<T> | null>(null);
  useEffect(() => {
    if (!buscar) {
      setCarga(null);
      return;
    }
    const controle = new AbortController();
    setCarga({ estado: "carregando" });
    buscar(controle.signal).then(
      (dados) => setCarga({ estado: "pronto", dados }),
      (erro) => {
        if (controle.signal.aborted) return;
        setCarga({ estado: "erro", mensagem: erro instanceof ErroApi ? erro.message : "Erro inesperado." });
      },
    );
    return () => controle.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);
  return carga;
}
