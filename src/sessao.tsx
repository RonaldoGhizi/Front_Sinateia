// Quem entrou na conta. O token fica num cookie HttpOnly que o JavaScript não lê:
// a tela só sabe da sessão perguntando à API (GET /auth/sessao).

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, type Conta } from "./api";
import { Carregando } from "./componentes/Etiqueta";

interface Sessao {
  /** undefined enquanto a API não respondeu; null para quem não entrou. */
  conta: Conta | null | undefined;
  definirConta: (conta: Conta | null) => void;
  sair: () => Promise<void>;
}

const Contexto = createContext<Sessao | null>(null);

export function ProvedorDeSessao({ children }: { children: ReactNode }) {
  const [conta, setConta] = useState<Conta | null | undefined>(undefined);

  useEffect(() => {
    const controle = new AbortController();
    api.sessao(controle.signal).then(setConta, () => {
      // Com a API fora do ar, a consulta pública mostra o próprio erro; aqui fica "não entrou".
      if (!controle.signal.aborted) setConta(null);
    });
    return () => controle.abort();
  }, []);

  const sair = useCallback(async () => {
    await api.sair();
    setConta(null);
  }, []);

  const valor = useMemo(() => ({ conta, definirConta: setConta, sair }), [conta, sair]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): Sessao {
  const sessao = useContext(Contexto);
  if (!sessao) throw new Error("useSessao fora do ProvedorDeSessao");
  return sessao;
}

/** Envolve as páginas que exigem conta (perfis e, no futuro, processos do DataJud). */
export function RequerLogin({ children }: { children: ReactNode }) {
  const { conta } = useSessao();
  const local = useLocation();
  if (conta === undefined) return <Carregando />;
  if (conta === null) return <Navigate to={`/entrar?voltar=${encodeURIComponent(local.pathname + local.search)}`} replace />;
  return <>{children}</>;
}

/** Só aceita voltar para um caminho deste site (evita redirecionar para fora). */
export function destinoSeguro(voltar: string | null): string {
  return voltar && voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "/perfis";
}
