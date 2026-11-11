import { useRef, useState } from "react";
import { api, ErroApi, type Atualizacao, type Fonte, type SituacaoFonte } from "../api";
import { data, dataHora, numero } from "../formato";
import { useSessao } from "../sessao";
import { useCarregar } from "../useCarregar";
import { Aviso, Carregando, Etiqueta, type Tom } from "./Etiqueta";

const DESCRICAO: Record<string, { nome: string; uso: string; unidade: string; comando: string }> = {
  anvisa_registros: { nome: "Anvisa", uso: "Registro, situação e categoria do medicamento", unidade: "registros", comando: "carregar anvisa" },
  cmed_pmvg: { nome: "CMED · PMVG", uso: "Preço fábrica (PF) e preço máximo de venda ao governo (PMVG)", unidade: "apresentações", comando: "carregar cmed ARQUIVO" },
  cmed_pmc: { nome: "CMED · PMC", uso: "Preço máximo ao consumidor", unidade: "apresentações", comando: "carregar cmed ARQUIVO" },
  sigtap: { nome: "SIGTAP / DATASUS", uso: "CID-10 e medicamentos do SUS por doença", unidade: "linhas", comando: "carregar sigtap" },
  rename: { nome: "RENAME", uso: "Medicamentos essenciais do SUS e o componente de cada um", unidade: "itens", comando: "carregar rename ARQUIVO" },
  conitec_recomendacoes: { nome: "Conitec", uso: "Decisões de incorporação ao SUS", unidade: "recomendações", comando: "carregar conitec ARQUIVO" },
  pcdt_cid: { nome: "PCDT", uso: "Medicamentos de cada CID nos protocolos do SUS", unidade: "linhas", comando: "carregar pcdt ARQUIVO" },
  catmat: { nome: "BNAFAR · CATMAT", uso: "Códigos para consultar o estoque das farmácias do SUS", unidade: "códigos", comando: "bnafar codigos" },
};

const ESPERADAS = Object.keys(DESCRICAO);

/**
 * As bases carregadas. Com `detalhada` (página Fontes de dados), mostra também como cada uma se
 * atualiza, a última tentativa e, para o administrador, o botão de enviar o arquivo.
 */
export function Fontes({ detalhada = false }: { detalhada?: boolean }) {
  const [versao, setVersao] = useState(0);
  const carga = useCarregar((sinal) => api.fontes(sinal), [versao]);
  const situacoes = useCarregar(detalhada ? (sinal) => api.atualizacoes(sinal) : null, [detalhada, versao]);
  if (!carga || carga.estado === "carregando") return <Carregando />;
  if (carga.estado === "erro") return <Aviso>{carga.mensagem}</Aviso>;
  const porFonte = new Map(carga.dados.map((f) => [f.fonte, f]));
  const situacaoPorFonte = new Map(situacoes?.estado === "pronto" ? situacoes.dados.map((s) => [s.fonte, s]) : []);
  const chaves = [...ESPERADAS, ...carga.dados.map((f) => f.fonte).filter((f) => !DESCRICAO[f])];
  return (
    <>
      {situacoes?.estado === "erro" && <Aviso tom="alerta">Não consegui ler a situação das atualizações: {situacoes.mensagem}</Aviso>}
      <div className="grade-fontes">
        {chaves.map((chave) => (
          <CartaoFonte
            key={chave}
            chave={chave}
            fonte={porFonte.get(chave)}
            situacao={situacaoPorFonte.get(chave)}
            aoEnviar={() => setVersao((v) => v + 1)}
          />
        ))}
      </div>
    </>
  );
}

function CartaoFonte({
  chave,
  fonte,
  situacao,
  aoEnviar,
}: {
  chave: string;
  fonte?: Fonte;
  situacao?: SituacaoFonte;
  aoEnviar: () => void;
}) {
  const { conta } = useSessao();
  const d = DESCRICAO[chave] ?? { nome: chave, uso: "", unidade: "linhas", comando: "carregar" };
  return (
    <article className="cartao fonte">
      <div>{fonte ? <Etiqueta tom="ok">Carregada</Etiqueta> : <Etiqueta tom="alerta">Não carregada</Etiqueta>}</div>
      <h3>{d.nome}</h3>
      {fonte ? (
        <>
          <p className="fonte-numero">
            <strong>{numero(fonte.linhas)}</strong> {d.unidade}
          </p>
          <p className="secundario">
            {fonte.arquivo} · carregada em {data(fonte.criada_em)}
          </p>
        </>
      ) : (
        <p className="secundario">
          Rode <code>sinateia {d.comando}</code> para carregar.
        </p>
      )}
      <p className="secundario">Usada para: {d.uso}</p>
      {situacao && <Atualizacoes situacao={situacao} />}
      {situacao && conta?.papel === "admin" && <EnviarArquivo situacao={situacao} aoEnviar={aoEnviar} />}
    </article>
  );
}

const SITUACAO: Record<Atualizacao["situacao"], { tom: Tom; texto: string }> = {
  carregada: { tom: "ok", texto: "Versão nova em" },
  sem_novidade: { tom: "neutro", texto: "Conferida em" },
  recusada: { tom: "alerta", texto: "Versão nova recusada em" },
  erro: { tom: "perigo", texto: "Erro em" },
};

function frequencia(dias: number | null): string {
  if (dias === null) return "Atualização manual: a fonte não tem link para baixar.";
  if (dias === 7) return "Atualiza sozinha toda semana.";
  if (dias % 7 === 0) return `Atualiza sozinha a cada ${dias / 7} semanas.`;
  return `Atualiza sozinha a cada ${dias} dias.`;
}

function Atualizacoes({ situacao }: { situacao: SituacaoFonte }) {
  const ultima = situacao.ultima;
  return (
    <div className="fonte-atualizacao">
      <p className="nota">{frequencia(situacao.a_cada_dias)}</p>
      {ultima && (
        <>
          <div>
            <Etiqueta tom={SITUACAO[ultima.situacao].tom}>
              {SITUACAO[ultima.situacao].texto} {dataHora(ultima.iniciada_em)}
            </Etiqueta>
          </div>
          {ultima.gatilho === "envio" && <p className="nota">Arquivo enviado pela página Fontes.</p>}
          {ultima.mensagem && (ultima.situacao === "erro" || ultima.situacao === "recusada") && (
            <p className="nota fonte-erro">{ultima.mensagem}</p>
          )}
        </>
      )}
    </div>
  );
}

type Envio =
  | { estado: "parado" }
  | { estado: "enviando"; nome: string }
  | { estado: "pronto"; texto: string }
  | { estado: "recusado"; arquivo: File; texto: string }
  | { estado: "erro"; texto: string };

/** Para o administrador: carrega um arquivo baixado ou exportado à mão (a RENAME, por exemplo). */
function EnviarArquivo({ situacao, aoEnviar }: { situacao: SituacaoFonte; aoEnviar: () => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [envio, setEnvio] = useState<Envio>({ estado: "parado" });

  async function enviar(arquivo: File, forcar = false) {
    setEnvio({ estado: "enviando", nome: arquivo.name });
    try {
      const resultado = await api.enviarFonte(situacao.grupo, arquivo, forcar);
      const texto =
        resultado.situacao === "carregada"
          ? `Carregado: ${resultado.mensagem}.`
          : `Esse arquivo já tinha sido carregado (${resultado.mensagem}); ele é a versão ativa.`;
      setEnvio({ estado: "pronto", texto });
      aoEnviar();
    } catch (erro) {
      const texto = erro instanceof ErroApi ? erro.message : "Erro inesperado.";
      if (erro instanceof ErroApi && erro.status === 409) setEnvio({ estado: "recusado", arquivo, texto });
      else setEnvio({ estado: "erro", texto });
    }
  }

  return (
    <div className="fonte-envio">
      <input
        ref={entrada}
        type="file"
        accept=".csv,.xlsx,.xls,.zip"
        hidden
        onChange={(evento) => {
          const arquivo = evento.target.files?.[0];
          evento.target.value = "";
          if (arquivo) void enviar(arquivo);
        }}
      />
      <button
        type="button"
        className="botao pequeno"
        disabled={envio.estado === "enviando"}
        onClick={() => entrada.current?.click()}
      >
        {envio.estado === "enviando" ? `Carregando ${envio.nome}…` : "Enviar arquivo"}
      </button>
      {envio.estado === "enviando" && <p className="nota">Uma lista da CMED leva cerca de um minuto.</p>}
      {envio.estado === "pronto" && <Aviso tom="ok">{envio.texto}</Aviso>}
      {envio.estado === "erro" && <Aviso>{envio.texto}</Aviso>}
      {envio.estado === "recusado" && (
        <Aviso tom="alerta">
          {envio.texto}
          <div>
            <button type="button" className="botao pequeno" onClick={() => void enviar(envio.arquivo, true)}>
              Carregar mesmo assim
            </button>
          </div>
        </Aviso>
      )}
    </div>
  );
}
