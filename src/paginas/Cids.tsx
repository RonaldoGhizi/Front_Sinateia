import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, type CidFontesAbertas, type MedicamentoAberto, type MedicamentoSus, type Registro } from "../api";
import { Aviso, Carregando, Etiqueta } from "../componentes/Etiqueta";
import { componente, faixaDeIdade, frase, nomeDaUf, percentual, reais, registroAnvisa, UFS } from "../formato";
import { enderecoDoRelatorio } from "../recentes";
import { type Carga, useCarregar } from "../useCarregar";

export function Cids() {
  const { codigo } = useParams();
  const [parametros, setParametros] = useSearchParams();
  const navegar = useNavigate();
  const uf = parametros.get("uf") ?? "";
  const [termo, setTermo] = useState(parametros.get("q") ?? "");
  const busca = parametros.get("q") ?? "";

  const resultados = useCarregar(busca.length >= 2 ? (sinal) => api.buscarCids(busca, sinal) : null, [busca]);
  const detalhe = useCarregar(codigo ? (sinal) => api.obterCid(codigo, sinal) : null, [codigo]);
  const abertas = useCarregar(codigo ? (sinal) => api.obterCidFontesAbertas(codigo, sinal) : null, [codigo]);

  function pesquisar(evento: React.FormEvent) {
    evento.preventDefault();
    const novos = new URLSearchParams(parametros);
    novos.set("q", termo.trim());
    setParametros(novos);
  }

  function mudarUf(novaUf: string) {
    const novos = new URLSearchParams(parametros);
    if (novaUf) novos.set("uf", novaUf);
    else novos.delete("uf");
    setParametros(novos, { replace: true });
  }

  const sufixo = parametros.toString() ? `?${parametros}` : "";

  return (
    <>
      <header className="cabecalho">
        <h1>Medicamentos por doença (CID)</h1>
        <p>
          Digite o código ou o nome da doença. O Sinatéia mostra o que o SUS fornece para ela, outros remédios citados em bases internacionais e o preço
          máximo de cada medicamento.
        </p>
      </header>

      <div className="duas-colunas">
        <aside className="cartao coluna-busca">
          <form onSubmit={pesquisar} className="campo">
            <label htmlFor="busca-cid">Doença</label>
            <div className="busca">
              <input id="busca-cid" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Ex.: G12 ou atrofia" />
              <button type="submit" className="botao primario pequeno">
                Buscar
              </button>
            </div>
          </form>
          {resultados?.estado === "carregando" && <Carregando />}
          {resultados?.estado === "erro" && <Aviso>{resultados.mensagem}</Aviso>}
          {resultados?.estado === "pronto" && (
            <>
              <p className="secundario">
                {resultados.dados.length} {resultados.dados.length === 1 ? "doença encontrada" : "doenças encontradas"}
              </p>
              <ul className="lista-cids">
                {resultados.dados.map((c) => (
                  <li key={c.codigo}>
                    <Link
                      to={`/cids/${encodeURIComponent(c.codigo)}${sufixo}`}
                      className={c.codigo === codigo ? "cid-item ativo" : "cid-item"}
                      aria-current={c.codigo === codigo ? "page" : undefined}
                    >
                      <span className="mono">{c.codigo}</span>
                      <span>{c.nome}</span>
                      {c.encontrado_como && <span className="nota">Achado como “{c.encontrado_como}”</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="campo">
            <label htmlFor="uf-cid">Estado</label>
            <select id="uf-cid" value={uf} onChange={(e) => mudarUf(e.target.value)}>
              <option value="">Escolha para ver os preços</option>
              {UFS.map(([sigla, nome]) => (
                <option key={sigla} value={sigla}>
                  {nome} ({sigla})
                </option>
              ))}
            </select>
            <span className="dica">Define o ICMS do preço máximo</span>
          </div>
        </aside>

        <section className="coluna-resultado">
          {!codigo && <p className="secundario cartao">Busque uma doença e escolha o CID na lista.</p>}
          {detalhe?.estado === "carregando" && <Carregando />}
          {detalhe?.estado === "erro" && <Aviso>{detalhe.mensagem}</Aviso>}
          {detalhe?.estado === "pronto" && (
            <>
              <div className="cartao cartao-titulo">
                <div>
                  <span className="mono destaque-cid">{detalhe.dados.codigo}</span>
                  <h2>{detalhe.dados.nome}</h2>
                  <p className="secundario">
                    {detalhe.dados.medicamentos_sus.length === 0
                      ? "A Tabela Unificada não libera nenhum medicamento para este CID."
                      : `O SUS fornece ${detalhe.dados.medicamentos_sus.length} ${detalhe.dados.medicamentos_sus.length === 1 ? "medicamento" : "medicamentos"} para este CID.`}
                    {uf && ` Preços para ${nomeDaUf(uf)}.`}
                  </p>
                </div>
                <button
                  type="button"
                  className="botao"
                  onClick={() =>
                    navegar(`/?cid=${encodeURIComponent(detalhe.dados.codigo)}&cid_nome=${encodeURIComponent(detalhe.dados.nome ?? "")}${uf ? `&uf=${uf}` : ""}`)
                  }
                >
                  Nova consulta com {detalhe.dados.codigo}
                </button>
              </div>
              {detalhe.dados.medicamentos_sus.map((m) => (
                <CartaoMedicamentoSus key={m.substancia} medicamento={m} cid={detalhe.dados.codigo} uf={uf} />
              ))}
              <div className="cartao">
                <h3>O que esta lista não mostra</h3>
                {detalhe.dados.observacoes.map((o) => (
                  <p key={o} className="secundario">
                    {o}
                  </p>
                ))}
              </div>
              <FontesAbertas carga={abertas} cid={detalhe.dados.codigo} uf={uf} />
            </>
          )}
        </section>
      </div>
    </>
  );
}

function CartaoMedicamentoSus({ medicamento, cid, uf }: { medicamento: MedicamentoSus; cid: string; uf: string }) {
  const principal = medicamento.registros_anvisa.find((r) => r.valido) ?? null;
  const cids = [...new Set(medicamento.procedimentos.flatMap((p) => p.cids.map((c) => c.codigo)))];
  return (
    <article className="cartao medicamento-sus">
      <header>
        <h3>{frase(medicamento.substancia)}</h3>
        <p className="secundario">
          {principal ? `${principal.nome_produto} · ${principal.empresa ?? ""}` : "Nenhum registro válido na base da Anvisa"}
        </p>
        <Etiqueta tom="info">{[...new Set(medicamento.procedimentos.map((p) => componente(p.componente)))].join("; ")}</Etiqueta>
      </header>
      <dl className="dados">
        <div>
          <dt>Procedimento SIGTAP</dt>
          {medicamento.procedimentos.map((p) => (
            <dd key={p.codigo}>
              <span className="mono">{p.codigo}</span>
              <div className="secundario">{frase(p.nome)}</div>
            </dd>
          ))}
        </div>
        <div>
          <dt>Idade liberada</dt>
          {[...new Set(medicamento.procedimentos.map((p) => faixaDeIdade(p.idade_minima_meses, p.idade_maxima_meses)))].map((f) => (
            <dd key={f}>{f}</dd>
          ))}
        </div>
        <div>
          <dt>CIDs liberados</dt>
          <dd className="lista-codigos">
            {cids.map((c) => (
              <span key={c} className={c === cid ? "codigo ativo" : "codigo"}>
                {c}
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt>Registros na Anvisa</dt>
          <dd>
            {medicamento.total_registros_anvisa} {medicamento.total_registros_anvisa === 1 ? "registro" : "registros"}
          </dd>
        </div>
      </dl>
      {principal && uf && <TetoDoRegistro registro={principal} uf={uf} />}
      <Registros registros={medicamento.registros_anvisa} total={medicamento.total_registros_anvisa} cid={cid} uf={uf} />
    </article>
  );
}

function TetoDoRegistro({ registro, uf }: { registro: Registro; uf: string }) {
  const carga = useCarregar((sinal) => api.obterMedicamento(registro.numero_registro, { uf }, sinal), [registro.numero_registro, uf]);
  if (!carga || carga.estado === "carregando") return <Carregando texto="Buscando o preço…" />;
  if (carga.estado === "erro") return <Aviso tom="alerta">{carga.mensagem}</Aviso>;
  const comPreco = carga.dados.apresentacoes.filter((a) => a.preco_maximo?.judicial);
  if (!comPreco.length) return <p className="secundario">{registro.nome_produto}: sem PMVG na CMED.</p>;
  const valores = comPreco.map((a) => Number(a.preco_maximo!.judicial));
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const aliquota = comPreco[0].preco_maximo!.aliquota_icms;
  return (
    <div className="teto">
      <span className="resumo-rotulo">Teto em ação judicial ({uf})</span>
      <strong className="resumo-valor">{minimo === maximo ? reais(minimo) : `${reais(minimo)} a ${reais(maximo)}`}</strong>
      <span className="secundario">
        {registro.nome_produto} · PMVG com ICMS {percentual(aliquota)} · {comPreco.length}{" "}
        {comPreco.length === 1 ? "apresentação" : "apresentações"}
      </span>
    </div>
  );
}

function Registros({ registros, total, cid, uf }: { registros: Registro[]; total: number; cid: string; uf: string }) {
  if (!registros.length) return null;
  return (
    <details className="registros">
      <summary>
        Ver registros ({registros.length}
        {total > registros.length ? ` de ${total}` : ""})
      </summary>
      <ul>
        {registros.map((r) => (
          <li key={r.numero_registro}>
            <Link to={enderecoDoRelatorio({ registro: r.numero_registro, cid, uf: uf || null, idadeMeses: null, tipo: "judicial", alc: false })}>
              {r.nome_produto}
            </Link>{" "}
            <span className="secundario">
              {registroAnvisa(r.numero_registro)} · {r.empresa}
            </span>{" "}
            {!r.valido && <Etiqueta tom="perigo">{frase(r.situacao) || "Não válido"}</Etiqueta>}
          </li>
        ))}
      </ul>
    </details>
  );
}

function FontesAbertas({ carga, cid, uf }: { carga: Carga<CidFontesAbertas> | null; cid: string; uf: string }) {
  if (!carga || carga.estado === "carregando") return <Carregando texto="Buscando remédios em bases internacionais…" />;
  if (carga.estado === "erro") return <Aviso tom="alerta">{carga.mensagem}</Aviso>;
  const { medicamentos, total, observacoes } = carga.dados;
  return (
    <section className="fontes-abertas" aria-labelledby="titulo-fontes-abertas">
      <div className="cartao">
        <h2 id="titulo-fontes-abertas">Uso descrito em fontes internacionais</h2>
        <p className="secundario">
          {medicamentos.length === 0
            ? "Nenhum outro remédio para este CID nas bases abertas (Wikidata e ChEMBL)."
            : `${total} ${total === 1 ? "remédio" : "remédios"} fora da lista do SUS para este CID${total > medicamentos.length ? `; mostrando ${medicamentos.length}` : ""}.`}
        </p>
        {observacoes.map((o) => (
          <p key={o} className="nota">
            {o}
          </p>
        ))}
      </div>
      {medicamentos.map((m) => (
        <CartaoMedicamentoAberto key={`${m.substancia}-${m.nome_internacional}`} medicamento={m} cid={cid} uf={uf} />
      ))}
    </section>
  );
}

function rotuloDaFase(fase: string | null): { texto: string; tom: "ok" | "info" | "neutro" } {
  if (fase === null) return { texto: "Citado no Wikidata", tom: "neutro" };
  const numero = Number(fase);
  if (numero >= 4) return { texto: "Aprovado para a doença (FDA, EMA ou outra agência)", tom: "ok" };
  return { texto: `Em estudo clínico, fase ${Math.floor(numero)}`, tom: "info" };
}

function CartaoMedicamentoAberto({ medicamento, cid, uf }: { medicamento: MedicamentoAberto; cid: string; uf: string }) {
  const principal = medicamento.registros_anvisa.find((r) => r.valido) ?? null;
  const fase = rotuloDaFase(medicamento.maior_fase);
  const doencas = [...new Set(medicamento.evidencias.map((e) => e.doenca))];
  const fontes = [...new Map(medicamento.evidencias.map((e) => [e.origem, e])).values()];
  return (
    <article className="cartao medicamento-sus">
      <header>
        <h3>{frase(medicamento.substancia)}</h3>
        <p className="secundario">
          {medicamento.dcb && normalizado(medicamento.dcb) !== normalizado(medicamento.nome_internacional) && `${medicamento.nome_internacional} · `}
          {principal
            ? `${principal.nome_produto} · ${principal.empresa ?? ""}`
            : medicamento.dcb
              ? "Sem registro válido na Anvisa: só por importação (Tema 500)"
              : "Sem nome brasileiro (DCB) na lista da Anvisa: provavelmente sem registro no Brasil"}
        </p>
        <div className="etiquetas">
          <Etiqueta tom={fase.tom}>{fase.texto}</Etiqueta>
          {!medicamento.mesmo_cid && <Etiqueta tom="alerta">Outro CID do grupo {cid.slice(0, 3)}</Etiqueta>}
        </div>
      </header>
      <dl className="dados">
        <div>
          <dt>Doença na fonte</dt>
          {doencas.slice(0, 3).map((d) => (
            <dd key={d}>{d}</dd>
          ))}
        </div>
        <div>
          <dt>Fontes</dt>
          {fontes.map((e) => (
            <dd key={e.origem}>
              {e.referencia ? (
                <a href={e.referencia} target="_blank" rel="noreferrer">
                  {e.origem === "chembl" ? "ChEMBL" : "Wikidata"}
                </a>
              ) : e.origem === "chembl" ? (
                "ChEMBL"
              ) : (
                "Wikidata"
              )}
            </dd>
          ))}
        </div>
        {medicamento.atc && (
          <div>
            <dt>Código ATC</dt>
            <dd className="lista-codigos">
              {medicamento.atc.split("|").map((c) => (
                <span key={c} className="codigo">
                  {c}
                </span>
              ))}
            </dd>
          </div>
        )}
        <div>
          <dt>Registros na Anvisa</dt>
          <dd>{medicamento.dcb ? `${medicamento.total_registros_anvisa} ${medicamento.total_registros_anvisa === 1 ? "registro" : "registros"}` : "Não procurado (sem DCB)"}</dd>
        </div>
      </dl>
      {principal && uf && <TetoDoRegistro registro={principal} uf={uf} />}
      <Registros registros={medicamento.registros_anvisa} total={medicamento.total_registros_anvisa} cid={cid} uf={uf} />
    </article>
  );
}

function normalizado(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
