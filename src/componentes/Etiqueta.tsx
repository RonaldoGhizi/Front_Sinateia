import type { ReactNode } from "react";

export type Tom = "ok" | "alerta" | "perigo" | "neutro" | "info";

export function Etiqueta({ tom, children }: { tom: Tom; children: ReactNode }) {
  return <span className={`etiqueta etiqueta-${tom}`}>{children}</span>;
}

export function Aviso({ tom = "perigo", children }: { tom?: Tom; children: ReactNode }) {
  return (
    <div className={`aviso aviso-${tom}`} role={tom === "perigo" ? "alert" : "status"}>
      {children}
    </div>
  );
}

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <p className="carregando" role="status">
      {texto}
    </p>
  );
}
