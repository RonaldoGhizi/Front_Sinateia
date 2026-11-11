import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, type Apresentacao, type CidDetalhe, type CoberturaSus, type ComponenteRename, type EstoqueSus, type Medicamento, type RecomendacaoConitec } from "../api";
import { type CampoDePreco, caminho, faixaDoTeto, idadeAtende, procedimentosDoCid, situacaoSus, tipoDeCompra, type SituacaoSus } from "../analise";
import { Aviso, Carregando, Etiqueta, type Tom } from "../componentes/Etiqueta";
import { componente, data, faixaDeIdade, frase, idade, nomeDaUf, numero, percentual, reais, registroAnvisa, UFS, UFS_ALC } from "../formato";
import { type Carga, useCarregar } from "../useCarregar";

const TOM_SUS: Record<SituacaoSus["estado"], Tom> = {
  fornece: "ok",
  fora_da_idade: "perigo",
  nao_fornece: "perigo",
  incorporado: "info",
  desconhecido: "alerta",
  sem_cid: "neutro",
};

export function Relatorio() {
  const { registro = "" } = useParams();
  const [parametros, setParametros] = useSearchParams();
  const cid = parametros.get("cid");
  const uf = parametros.get("uf");
  const alc = parametros.get("alc") === "1";
  const idadeTexto = parametros.get("idade");
  const meses = idadeTexto === null || idadeTexto === "" ? null : Number(idadeTexto);
  const tipo = tipoDeCompra(parametros.get("tipo"));

  const carga = useCarregar(
    (sinal) => api.obterMedicamento(registro, { uf: uf ?? undefined, cid: cid ?? undefined, alc }, sinal),
    [registro, uf, cid, alc],
  );
  const cargaCid = useCarregar(cid ? (sinal) => api.obterCid(cid, sinal) : null, [cid]);
  // Consulta a BNAFAR na hora e pode demorar: vem à parte, sem segurar o relatório.
  const cargaEstoque = useCarregar(uf ? (sinal) => api.estoqueSus(registro, uf, sinal) : null, [registro, uf]);

  if (!carga || carga.estado === "carregando") return <Carregando texto="Montando o relatório…" />;
  if (carga.estado === "erro") {
    return (
      <>
        <Aviso>{carga.mensagem}</Aviso>
        <Link to="/">Voltar para a nova consulta</Link>
      </>
    );
  }

  const medicamento = carga.dados;
  const sus = situacaoSus(medicamento, cid, meses);
  const rota = caminho(medicamento, sus);
  const teto = faixaDoTeto(medicamento.apresentacoes, tipo.campo);
  const aliquota = medicamento.apresentacoes.find((a) => a.preco_maximo)?.preco_maximo?.aliquota_icms;
  const detalheCid = cargaCid?.estado === "pronto" ? cargaCid.dados : null;

  function mudarUf(novaUf: string) {
    const novos = new URLSearchParams(parametros);
    if (novaUf) novos.set("uf", novaUf);
    else novos.delete("uf");
    novos.delete("alc");
    setParametros(novos, { replace: true });
  }

  function mudarAlc(ligado: boolean) {
    const novos = new URLSearchParams(parametros);
    if (ligado) novos.set("alc", "1");
    else novos.delete("alc");
    setParametros(novos, { replace: true });
  }

  return (
    <>
      <nav className="migalhas" aria-label="Caminho">
        <Link to="/">Nova consulta</Link> / <span>{medicamento.nome_produto}</span>
      </nav>
      <header className="cabecalho cabecalho-acoes">
        <div>
          <h1>
            {medicamento.nome_produto}
            {cid && <> para {cid}</>}
            {meses !== null && <span className="titulo-sub">, paciente de {idade(meses)}</span>}
          </h1>
          <p>
            {[
              `Consulta de ${new Date().toLocaleDateString("pt-BR")}`,
              uf ? `${nomeDaUf(uf)}${aliquota ? ` (ICMS ${percentual(aliquota)})` : ""}${alc ? " · área de livre comércio" : ""}` : "sem estado",
              `compra: ${tipo.rotulo.toLocaleLowerCase("pt-BR")}`,
            ].join(" · ")}
          </p>
        </div>
        <div className="acoes nao-imprimir">
          <button type="button" className="botao primario" onClick={() => window.print()}>
            Imprimir ou salvar PDF
          </button>
          <Link className="botao" to="/">
            Nova consulta
          </Link>
        </div>
      </header>

      <section className="resumo" aria-label="Resumo">
        <article className="cartao resumo-item">
          <span className="resumo-rotulo">SUS</span>
          <Etiqueta tom={TOM_SUS[sus.estado]}>{sus.titulo}</Etiqueta>
          <p className="secundario">{sus.detalhe}</p>
        </article>
        <article className="cartao resumo-item">
          <span className="resumo-rotulo">Anvisa</span>
          <Etiqueta tom={medicamento.valido ? "ok" : "perigo"}>{medicamento.valido ? "Registro válido" : frase(medicamento.situacao) || "Registro não válido"}</Etiqueta>
          <p className="secundario">
            {registroAnvisa(medicamento.numero_registro)} · {medicamento.empresa}
          </p>
        </article>
        <article className="cartao resumo-item">
          <span className="resumo-rotulo">Teto de venda</span>
          {teto ? (
            <>
              <strong className="resumo-valor">
                {teto.minimo === teto.maximo ? reais(teto.minimo) : `${reais(teto.minimo)} a ${reais(teto.maximo)}`}
              </strong>
              <p className="secundario">
                {tipo.teto} em {uf}
                {aliquota && `, ICMS ${percentual(aliquota)}`}
              </p>
            </>
          ) : (
            <p className="secundario">{uf ? "Sem preço na CMED para este tipo de compra." : "Escolha o estado para ver o teto."}</p>
          )}
        </article>
        <article className="cartao resumo-item">
          <span className="resumo-rotulo">Caminho</span>
          <Etiqueta tom={rota.tema ? "info" : "neutro"}>{rota.titulo}</Etiqueta>
          <p className="secundario">{rota.detalhe}</p>
        </article>
      </section>

      {medicamento.cobertura_sus.fontes_ausentes.length > 0 && (
        <Aviso tom="alerta">
          <p>
            Fontes sobre o SUS ainda não carregadas: {medicamento.cobertura_sus.fontes_ausentes.join(", ")}. O resultado pode
            mudar quando forem carregadas.
          </p>
        </Aviso>
      )}

      <FornecimentoPeloSus cobertura={medicamento.cobertura_sus} />

      <EstoqueNoSus uf={uf} carga={cargaEstoque} />

      {cid && <OfertaDoSus cid={cid} carga={cargaCid} medicamento={medicamento} meses={meses} />}

      <section className="cartao">
        <div className="cartao-titulo">
          <div>
            <h2>Preço máximo{uf ? ` em ${nomeDaUf(uf)}` : ""}</h2>
            <p className="secundario">Tetos da CMED por apresentação, com o ICMS do estado.</p>
          </div>
          <div className="campo campo-compacto nao-imprimir">
            <label htmlFor="uf-relatorio">Estado</label>
            <select id="uf-relatorio" value={uf ?? ""} onChange={(e) => mudarUf(e.target.value)}>
              <option value="">Escolha</option>
              {UFS.map(([sigla, nome]) => (
                <option key={sigla} value={sigla}>
                  {nome} ({sigla})
                </option>
              ))}
            </select>
          </div>
        </div>
        {uf && UFS_ALC.has(uf) && (
          <label className="caixa nao-imprimir">
            <input type="checkbox" checked={alc} onChange={(e) => mudarAlc(e.target.checked)} />
            Comprador na Zona Franca de Manaus ou numa área de livre comércio (preço ALC da CMED)
          </label>
        )}
        <TabelaDePrecos apresentacoes={medicamento.apresentacoes} destaque={tipo.campo} temUf={Boolean(uf)} />
        {uf && <ConferirPreco apresentacoes={medicamento.apresentacoes} campo={tipo.campo} rotulo={tipo.teto} />}
        <p className="nota">
          Em compra por decisão judicial o preço não pode passar do PMVG (Resolução CMED nº 3/2011 e Tema 1234 do STF).
        </p>
      </section>

      <section className="cartao">
        <h2>Registro na Anvisa</h2>
        <dl className="dados">
          <div>
            <dt>Registro</dt>
            <dd className="mono">{registroAnvisa(medicamento.numero_registro)}</dd>
          </div>
          <div>
            <dt>Empresa</dt>
            <dd>{medicamento.empresa ?? "—"}</dd>
          </div>
          <div>
            <dt>Princípio ativo</dt>
            <dd>{frase(medicamento.principio_ativo) || "—"}</dd>
          </div>
          <div>
            <dt>Categoria</dt>
            <dd>{frase(medicamento.categoria_regulatoria) || "—"}</dd>
          </div>
          <div>
            <dt>Classe terapêutica</dt>
            <dd>{frase(medicamento.classe_terapeutica) || "—"}</dd>
          </div>
          <div>
            <dt>Situação</dt>
            <dd>
              {frase(medicamento.situacao) || "—"}
              {medicamento.vencimento && ` · vence em ${data(medicamento.vencimento)}`}
            </dd>
          </div>
        </dl>
        <p className="nota">Fonte: Anvisa, dados abertos de medicamentos.</p>
      </section>

      {rota.tema === "6" && <RequisitosTema6 uf={uf} alternativas={alternativas(detalheCid, medicamento, meses)} cobertura={medicamento.cobertura_sus} />}
      {rota.tema === "500" && (
        <section className="cartao">
          <h2>Medicamento sem registro válido (Tema 500 do STF)</h2>
          <p>
            A ação corre contra a União, na Justiça Federal. Exige demora irrazoável da Anvisa em analisar o pedido de registro
            (o pedido é dispensado para doença rara ou ultrarrara), registro em agência renomada no exterior e não haver
            substituto com registro no Brasil.
          </p>
          <p className="nota">Resumo para orientar o comercial. A estratégia do processo é do advogado.</p>
        </section>
      )}
    </>
  );
}

const NOMES_COMPONENTES: Record<ComponenteRename, string> = {
  basico: "Básico: farmácia da unidade básica de saúde",
  estrategico: "Estratégico: programas do Ministério da Saúde",
  especializado: "Especializado: farmácia de alto custo do estado",
  oncologico: "Oncologia: hospital habilitado em câncer",
  hospitalar: "Procedimento hospitalar",
  insumo: "Insumo",
  outro: "Componente não identificado",
};

const DECISOES: Record<RecomendacaoConitec["decisao"], { rotulo: string; tom: Tom }> = {
  incorporado: { rotulo: "Incorporado", tom: "ok" },
  nao_incorporado: { rotulo: "Não incorporado", tom: "perigo" },
  excluido: { rotulo: "Excluído", tom: "perigo" },
  outra: { rotulo: "Outra", tom: "neutro" },
};

const FARMACIAS_LISTADAS = 10;

/** Estoque nas farmácias do SUS do estado, pela BNAFAR. */
function EstoqueNoSus({ uf, carga }: { uf: string | null; carga: Carga<EstoqueSus> | null }) {
  const [todas, setTodas] = useState(false);
  return (
    <section className="cartao">
      <div>
        <h2>Estoque nas farmácias do SUS{uf ? ` em ${nomeDaUf(uf)}` : ""}</h2>
        <p className="secundario">Posição enviada à BNAFAR pelas farmácias, consultada agora.</p>
      </div>
      {!uf && <p className="secundario">Escolha o estado para ver o estoque.</p>}
      {carga?.estado === "carregando" && <Carregando texto="Consultando a BNAFAR…" />}
      {carga?.estado === "erro" && <Aviso tom="alerta">{carga.mensagem}</Aviso>}
      {carga?.estado === "pronto" && (
        <>
          {carga.dados.codigos.length > 0 && carga.dados.codigos.every((c) => c.farmacias.length === 0) && (
            <p>Nenhuma farmácia do SUS no estado informou estoque deste medicamento.</p>
          )}
          {carga.dados.codigos
            .filter((c) => c.farmacias.length > 0)
            .map((codigo) => (
              <div key={codigo.codigo_catmat}>
                <h3>
                  {codigo.descricao ?? codigo.codigo_catmat} · {numero(Number(codigo.quantidade_total))} em {codigo.farmacias.length}{" "}
                  {codigo.farmacias.length === 1 ? "farmácia" : "farmácias"}
                </h3>
                <p className="secundario mono">CATMAT {codigo.codigo_catmat}</p>
                <div className="tabela-rolagem">
                  <table>
                    <thead>
                      <tr>
                        <th>Farmácia</th>
                        <th>Município</th>
                        <th>Quantidade</th>
                        <th>Validade mais próxima</th>
                        <th>Posição em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(todas ? codigo.farmacias : codigo.farmacias.slice(0, FARMACIAS_LISTADAS)).map((f) => (
                        <tr key={f.cnes}>
                          <td>
                            {f.nome ?? `CNES ${f.cnes}`}
                            {f.endereco && <div className="secundario">{f.endereco}</div>}
                            {f.telefone && <div className="secundario">Tel. {f.telefone}</div>}
                          </td>
                          <td>{f.municipio ?? "—"}</td>
                          <td>{numero(Number(f.quantidade))}</td>
                          <td>{data(f.validade_mais_proxima)}</td>
                          <td>{data(f.data_posicao)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!todas && codigo.farmacias.length > FARMACIAS_LISTADAS && (
                  <button type="button" className="botao texto pequeno" onClick={() => setTodas(true)}>
                    Ver as {codigo.farmacias.length} farmácias
                  </button>
                )}
              </div>
            ))}
          {carga.dados.codigos_nao_consultados.length > 0 && (
            <p className="secundario">Outros códigos não consultados: {carga.dados.codigos_nao_consultados.join(", ")}.</p>
          )}
          {carga.dados.observacoes.map((o) => (
            <p key={o} className="nota">
              {o}
            </p>
          ))}
        </>
      )}
    </section>
  );
}

/** As fontes por trás do veredito do SUS: RENAME, protocolos e decisões da Conitec. */
function FornecimentoPeloSus({ cobertura }: { cobertura: CoberturaSus }) {
  const protocolos = [...new Set(cobertura.pcdt.map((l) => l.pcdt).filter((p): p is string => Boolean(p)))];
  return (
    <section className="cartao">
      <div>
        <h2>Fornecimento pelo SUS</h2>
        <p className="secundario">{cobertura.resumo}</p>
      </div>
      {cobertura.observacoes.map((o) => (
        <p key={o}>{o}</p>
      ))}
      {cobertura.rename.length > 0 && (
        <>
          <h3>Na RENAME</h3>
          <div className="tabela-rolagem">
            <table>
              <thead>
                <tr>
                  <th>Medicamento</th>
                  <th>Apresentação</th>
                  <th>Onde o SUS entrega</th>
                  <th>ATC</th>
                </tr>
              </thead>
              <tbody>
                {cobertura.rename.map((item, i) => (
                  <tr key={i}>
                    <td>{item.medicamento}</td>
                    <td>{[item.concentracao, item.forma_farmaceutica].filter(Boolean).join(", ") || "—"}</td>
                    <td>
                      {item.componentes.map((c) => (
                        <div key={c}>{NOMES_COMPONENTES[c]}</div>
                      ))}
                      {item.grupo && <div className="secundario">Grupo {item.grupo} do CEAF</div>}
                      {item.modalidade && <div className="secundario">Aquisição: {item.modalidade.toLocaleLowerCase("pt-BR")}</div>}
                      {item.observacoes && !item.observacoes.startsWith("Grupo ") && <div className="secundario">{item.observacoes}</div>}
                    </td>
                    <td className="mono">{item.codigo_atc ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {protocolos.length > 0 && (
        <>
          <h3>Protocolos clínicos (PCDT)</h3>
          <ul>
            {protocolos.map((p) => (
              <li key={p}>
                {p}: CIDs{" "}
                {[...new Set(cobertura.pcdt.filter((l) => l.pcdt === p).map((l) => formatarCid(l.codigo_cid)))].join(", ")}
                {cobertura.pcdt.find((l) => l.pcdt === p && l.portaria) && (
                  <span className="secundario"> · {cobertura.pcdt.find((l) => l.pcdt === p && l.portaria)?.portaria}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {cobertura.conitec.length > 0 && (
        <>
          <h3>Decisões da Conitec</h3>
          <div className="tabela-rolagem">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Decisão</th>
                  <th>Tecnologia e indicação</th>
                  <th>Portaria</th>
                </tr>
              </thead>
              <tbody>
                {cobertura.conitec.map((r, i) => (
                  <tr key={i}>
                    <td>{r.data_decisao ? data(r.data_decisao) : "—"}</td>
                    <td>
                      <Etiqueta tom={DECISOES[r.decisao].tom}>{DECISOES[r.decisao].rotulo}</Etiqueta>
                      {r.decisao_original && <div className="secundario">{r.decisao_original}</div>}
                    </td>
                    <td>
                      {r.tecnologia}
                      {r.indicacao && <div className="secundario">{r.indicacao}</div>}
                    </td>
                    <td>
                      {r.portaria ?? "—"}
                      {r.relatorio?.startsWith("http") ? (
                        <div>
                          <a href={r.relatorio} target="_blank" rel="noreferrer">
                            Relatório
                          </a>
                        </div>
                      ) : (
                        r.relatorio && <div className="secundario">{r.relatorio}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="nota">Fontes consultadas: {cobertura.fontes_consultadas.join(", ") || "nenhuma"}.</p>
    </section>
  );
}

/** O que as decisões carregadas da Conitec dizem para o item (b) do Tema 6. */
function situacaoNaConitec(cobertura: CoberturaSus): string {
  const decisiva = cobertura.conitec.find((r) => r.decisao !== "outra");
  if (decisiva) {
    const quando = decisiva.data_decisao ? ` em ${data(decisiva.data_decisao)}` : "";
    const portaria = decisiva.portaria ? ` (${decisiva.portaria})` : "";
    const indicacao = decisiva.indicacao ? ` para ${decisiva.indicacao}` : "";
    return `${DECISOES[decisiva.decisao].rotulo}${quando}${portaria}${indicacao}. O advogado confere se a indicação é a do paciente.`;
  }
  if (cobertura.fontes_ausentes.includes("recomendações da Conitec")) return "O advogado confere a situação na Conitec.";
  return "Nenhuma decisão da Conitec sobre este medicamento nas recomendações carregadas: pode ser ausência de pedido.";
}

function formatarCid(codigo: string): string {
  return codigo.length > 3 ? `${codigo.slice(0, 3)}.${codigo.slice(3)}` : codigo;
}

function OfertaDoSus({
  cid,
  carga,
  medicamento,
  meses,
}: {
  cid: string;
  carga: ReturnType<typeof useCarregar<CidDetalhe>>;
  medicamento: Medicamento;
  meses: number | null;
}) {
  const codigosDoConsultado = new Set((medicamento.sus ?? []).map((p) => p.codigo));
  return (
    <section className="cartao">
      <div>
        <h2>O que o SUS oferece para {cid}</h2>
        <p className="secundario">
          {carga?.estado === "pronto" && carga.dados.nome ? `${carga.dados.nome}. ` : ""}Medicamentos que a Tabela Unificada libera
          para este CID.
        </p>
      </div>
      {(!carga || carga.estado === "carregando") && <Carregando />}
      {carga?.estado === "erro" && <Aviso tom="alerta">{carga.mensagem}</Aviso>}
      {carga?.estado === "pronto" &&
        (carga.dados.medicamentos_sus.length === 0 ? (
          <p className="secundario">A Tabela Unificada não libera nenhum medicamento para este CID.</p>
        ) : (
          <div className="tabela-rolagem">
            <table>
              <thead>
                <tr>
                  <th>Medicamento</th>
                  <th>Onde o SUS entrega</th>
                  <th>Idade</th>
                  <th>Para este paciente</th>
                </tr>
              </thead>
              <tbody>
                {carga.dados.medicamentos_sus.map((m) => {
                  const procedimentos = procedimentosDoCid(m.procedimentos, cid);
                  const atende = meses === null ? null : procedimentos.some((p) => idadeAtende(p, meses));
                  const consultado = m.procedimentos.some((p) => codigosDoConsultado.has(p.codigo));
                  const nomes = [...new Set(m.registros_anvisa.filter((r) => r.valido).map((r) => r.nome_produto))].slice(0, 3);
                  return (
                    <tr key={m.substancia} className={consultado ? "linha-destaque" : undefined}>
                      <td>
                        <strong>{frase(m.substancia)}</strong>
                        {consultado && <> <Etiqueta tom="info">consultado</Etiqueta></>}
                        <div className="secundario">{nomes.length ? nomes.join(", ") : "sem registro válido na base"}</div>
                      </td>
                      <td>{[...new Set(procedimentos.map((p) => componente(p.componente)))].join("; ")}</td>
                      <td>{[...new Set(procedimentos.map((p) => faixaDeIdade(p.idade_minima_meses, p.idade_maxima_meses)))].join("; ")}</td>
                      <td>
                        {atende === null ? (
                          <span className="secundario">Informe a idade</span>
                        ) : atende ? (
                          <Etiqueta tom="ok">Disponível</Etiqueta>
                        ) : (
                          <Etiqueta tom="perigo">Fora da faixa de idade</Etiqueta>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      {carga?.estado === "pronto" && carga.dados.observacoes.map((o) => (
        <p key={o} className="nota">
          {o}
        </p>
      ))}
      <p className="nota">Fonte: SIGTAP (DATASUS).</p>
    </section>
  );
}

/** Medicamentos que o SUS fornece para o CID e a idade, fora o consultado (item c do Tema 6). */
function alternativas(detalhe: CidDetalhe | null, medicamento: Medicamento, meses: number | null): string[] | null {
  if (!detalhe) return null;
  const codigos = new Set((medicamento.sus ?? []).map((p) => p.codigo));
  return detalhe.medicamentos_sus
    .filter((m) => !m.procedimentos.some((p) => codigos.has(p.codigo)))
    .filter((m) => meses === null || procedimentosDoCid(m.procedimentos, detalhe.codigo).some((p) => idadeAtende(p, meses)))
    .map((m) => frase(m.substancia));
}

const CAMPOS_DE_PRECO = [
  { campo: "judicial", rotulo: "Ação judicial (PMVG)" },
  { campo: "compra_publica", rotulo: "Compra pública" },
  { campo: "fabrica", rotulo: "Preço fábrica (PF)" },
  { campo: "consumidor", rotulo: "Consumidor (PMC)" },
] as const;

function TabelaDePrecos({ apresentacoes, destaque, temUf }: { apresentacoes: Apresentacao[]; destaque: string; temUf: boolean }) {
  const observacoes = useMemo(
    () =>
      [...new Set(apresentacoes.flatMap((a) => a.preco_maximo?.observacoes ?? []))].filter(
        (o) => !o.includes("alc=true"), // a caixa de área de livre comércio faz esse papel
      ),
    [apresentacoes],
  );
  if (!apresentacoes.length) return <p className="secundario">Nenhuma apresentação deste registro está nas listas da CMED carregadas.</p>;
  if (!temUf) return <p className="secundario">Escolha o estado para calcular o preço máximo de cada apresentação.</p>;
  return (
    <>
      <div className="tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Apresentação</th>
              {CAMPOS_DE_PRECO.map((c) => (
                <th key={c.campo} className={`numero${c.campo === destaque ? " coluna-destaque" : ""}`}>
                  {c.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apresentacoes.map((a) => (
              <tr key={`${a.registro}-${a.codigo_ggrem}-${a.apresentacao}`}>
                <td>
                  {a.apresentacao}
                  <div className="secundario">
                    {registroAnvisa(a.registro)}
                    {a.restricao_hospitalar && " · uso restrito a hospitais"}
                    {a.cap && " · CAP"}
                  </div>
                </td>
                {CAMPOS_DE_PRECO.map((c) => (
                  <td key={c.campo} className={`numero${c.campo === destaque ? " coluna-destaque" : ""}`}>
                    {reais(a.preco_maximo?.[c.campo])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {observacoes.map((o) => (
        <p key={o} className="nota">
          {o}
        </p>
      ))}
      <p className="nota">Fonte: CMED, listas PMVG e PMC.</p>
    </>
  );
}

function ConferirPreco({ apresentacoes, campo, rotulo }: { apresentacoes: Apresentacao[]; campo: CampoDePreco; rotulo: string }) {
  const comTeto = apresentacoes.filter((a) => a.preco_maximo?.[campo]);
  const [indice, setIndice] = useState(0);
  const [preco, setPreco] = useState("");
  if (!comTeto.length) return null;
  const escolhida = comTeto[Math.min(indice, comTeto.length - 1)];
  const teto = Number(escolhida.preco_maximo?.[campo]);
  const valor = Number(preco.replace(/\./g, "").replace(",", "."));
  const informado = preco.trim() !== "" && Number.isFinite(valor);
  return (
    <div className="conferir nao-imprimir">
      <div className="campo">
        <label htmlFor="apresentacao-preco">Apresentação</label>
        <select id="apresentacao-preco" value={indice} onChange={(e) => setIndice(Number(e.target.value))}>
          {comTeto.map((a, i) => (
            <option key={`${a.registro}-${a.apresentacao}`} value={i}>
              {a.apresentacao}
            </option>
          ))}
        </select>
      </div>
      <div className="campo">
        <label htmlFor="seu-preco">Seu preço (R$)</label>
        <input id="seu-preco" inputMode="decimal" placeholder="0,00" value={preco} onChange={(e) => setPreco(e.target.value)} />
      </div>
      <div className="conferir-resultado" aria-live="polite">
        {informado &&
          (valor > teto ? (
            <Etiqueta tom="perigo">Passa do teto ({rotulo} {reais(teto)}) em {reais(valor - teto)}</Etiqueta>
          ) : (
            <Etiqueta tom="ok">Dentro do teto ({rotulo} {reais(teto)})</Etiqueta>
          ))}
      </div>
    </div>
  );
}

function RequisitosTema6({ uf, alternativas, cobertura }: { uf: string | null; alternativas: string[] | null; cobertura: CoberturaSus }) {
  const itens = [
    ["a", "Negativa do SUS por escrito", `Pedir na Secretaria de Saúde${uf ? ` de ${nomeDaUf(uf)}` : ""} e guardar o protocolo.`],
    ["b", "Conitec: ilegalidade da não incorporação, ausência de pedido ou demora em decidir", situacaoNaConitec(cobertura)],
    [
      "c",
      "Não há substituto nas listas do SUS",
      alternativas?.length
        ? `O SUS oferece ${alternativas.join(", ")} para este CID: o médico precisa explicar no laudo por que não servem.`
        : "O médico explica no laudo por que as opções do SUS não servem.",
    ],
    ["d", "Eficácia e segurança com evidência de alto nível", "Ensaios clínicos randomizados, revisão sistemática ou meta-análise."],
    ["e", "Laudo médico fundamentado", "Mostra que o tratamento é imprescindível e o que já foi tentado."],
    ["f", "Incapacidade financeira da família", "Declaração e comprovantes de renda."],
  ];
  return (
    <section className="cartao">
      <div>
        <h2>O que o advogado vai precisar (Tema 6 do STF)</h2>
        <p className="secundario">
          O medicamento tem registro na Anvisa e o SUS não fornece para este caso. A ação precisa mostrar todos os itens, juntos.
        </p>
      </div>
      <ol className="requisitos">
        {itens.map(([letra, titulo, texto]) => (
          <li key={letra}>
            <span className="requisito-letra">({letra})</span>
            <div>
              <strong>{titulo}</strong>
              <p className="secundario">{texto}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="nota">
        Se o tratamento custar mais de 210 salários mínimos por ano, a ação corre na Justiça Federal, contra a União (Tema 1234).
        Resumo para orientar o comercial. A estratégia do processo é do advogado.
      </p>
    </section>
  );
}
