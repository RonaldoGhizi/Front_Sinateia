import { Fontes } from "../componentes/Fontes";

export function FontesDeDados() {
  return (
    <>
      <header className="cabecalho">
        <h1>Fontes de dados</h1>
        <p>
          As bases públicas carregadas no Sinatéia. Cada relatório usa a versão ativa de cada uma. No servidor, as que têm
          link para baixar se atualizam sozinhas toda semana.
        </p>
      </header>
      <Fontes detalhada />
      <section className="cartao">
        <h2>DataJud / CNJ</h2>
        <p className="secundario">
          Em breve: acompanhar os processos da empresa pelo número CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO).
        </p>
      </section>
    </>
  );
}
