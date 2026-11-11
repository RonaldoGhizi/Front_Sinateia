import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type Cid, ErroApi, type Perfil, type Registro } from "../api";
import { CampoDeBusca } from "../componentes/CampoDeBusca";
import { Aviso, Carregando, Etiqueta } from "../componentes/Etiqueta";
import { frase, idade, nomeDaUf, registroAnvisa } from "../formato";
import { enderecoDoRelatorio } from "../recentes";
import { useSessao } from "../sessao";
import { FormularioDoPerfil } from "./Perfis";

const textoDoCid = (c: Cid) => `${c.codigo} · ${c.nome ?? ""}`;
const textoDoRegistro = (r: Registro) => r.nome_produto;

function mensagem(erro: unknown): string {
  return erro instanceof ErroApi ? erro.message : "Erro inesperado.";
}

export function PerfilPaciente() {
  const { id } = useParams();
  const perfilId = Number(id);
  const { conta } = useSessao();
  const navegar = useNavigate();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cid, setCid] = useState<Cid | null>(null);
  const [registro, setRegistro] = useState<Registro | null>(null);
  const [semRegistro, setSemRegistro] = useState(false);
  const [nomeImportado, setNomeImportado] = useState("");
  const [cidDoRemedio, setCidDoRemedio] = useState("");

  useEffect(() => {
    const controle = new AbortController();
    api.perfil(perfilId, controle.signal).then(setPerfil, (e) => {
      if (!controle.signal.aborted) setErroCarga(mensagem(e));
    });
    return () => controle.abort();
  }, [perfilId]);

  if (erroCarga) return <Aviso>{erroCarga}</Aviso>;
  if (!perfil) return <Carregando />;
  const podeSaude = Boolean(conta?.consentimento_saude);

  async function executar(acao: () => Promise<Perfil>) {
    setErro(null);
    try {
      setPerfil(await acao());
      return true;
    } catch (e) {
      setErro(mensagem(e));
      return false;
    }
  }

  async function adicionarDoenca() {
    if (!cid) return setErro("Escolha a doença na lista de sugestões.");
    if (await executar(() => api.adicionarDoenca(perfilId, cid.codigo))) setCid(null);
  }

  async function adicionarRemedio() {
    const dados = semRegistro
      ? { nome: nomeImportado.trim(), codigo_cid: cidDoRemedio || undefined }
      : { numero_registro: registro?.numero_registro, codigo_cid: cidDoRemedio || undefined };
    if (semRegistro ? !dados.nome : !registro) return setErro(semRegistro ? "Escreva o nome do remédio." : "Escolha o remédio na lista de sugestões.");
    if (await executar(() => api.adicionarMedicamento(perfilId, dados))) {
      setRegistro(null);
      setNomeImportado("");
      setCidDoRemedio("");
    }
  }

  async function excluirPerfil() {
    if (!window.confirm(`Excluir o perfil ${perfil!.nome}, com as doenças e os remédios? Não tem volta.`)) return;
    try {
      await api.excluirPerfil(perfilId);
      navegar("/perfis", { replace: true });
    } catch (e) {
      setErro(mensagem(e));
    }
  }

  return (
    <>
      <nav className="migalhas" aria-label="Caminho">
        <Link to="/perfis">Perfis</Link> / {perfil.nome}
      </nav>
      <header className="cabecalho cabecalho-acoes">
        <div className="cabecalho">
          <h1>{perfil.nome}</h1>
          <p>
            {[perfil.idade_meses === null ? "Idade não informada" : idade(perfil.idade_meses), perfil.uf ? nomeDaUf(perfil.uf) : "Estado não informado"].join(" · ")}
          </p>
        </div>
        <div className="acoes">
          {!editando && (
            <button type="button" className="botao" onClick={() => setEditando(true)}>
              Editar dados
            </button>
          )}
          <button type="button" className="botao texto" onClick={excluirPerfil}>
            Excluir perfil
          </button>
        </div>
      </header>

      {editando && (
        <section className="cartao">
          <h2>Dados do perfil</h2>
          <FormularioDoPerfil
            inicial={perfil}
            rotuloSalvar="Salvar"
            aoCancelar={() => setEditando(false)}
            aoSalvar={async (dados) => {
              setPerfil(await api.alterarPerfil(perfilId, dados));
              setEditando(false);
            }}
          />
        </section>
      )}

      {erro && <Aviso>{erro}</Aviso>}
      {!podeSaude && (
        <Aviso tom="alerta">
          Doenças e remédios só podem ser guardados com a sua autorização. Autorize em <Link to="/conta">Minha conta</Link>.
        </Aviso>
      )}

      <section className="cartao">
        <div>
          <h2>Doenças</h2>
          <p className="secundario">CID-10 de cada doença do paciente, como está no laudo.</p>
        </div>
        {perfil.doencas.length > 0 && (
          <ul className="lista-itens">
            {perfil.doencas.map((d) => (
              <li key={d.id}>
                <span>
                  <strong className="mono">{d.codigo_cid}</strong> {d.nome}
                </span>
                <span className="acoes">
                  <Link to={`/cids/${encodeURIComponent(d.codigo_cid)}${perfil.uf ? `?uf=${perfil.uf}` : ""}`}>Medicamentos do SUS</Link>
                  <button type="button" className="botao texto pequeno" onClick={() => executar(() => api.removerDoenca(perfilId, d.id))}>
                    Remover
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {podeSaude && (
          <div className="adicionar">
            <CampoDeBusca
              rotulo="Acrescentar doença"
              dica="Código CID-10 ou nome da doença"
              placeholder="Ex.: G12.0 ou atrofia muscular"
              minimo={2}
              buscar={api.buscarCids}
              chave={(c) => c.codigo}
              texto={textoDoCid}
              escolhido={cid}
              aoEscolher={setCid}
              item={(c) => (
                <div className="sugestao">
                  <span>
                    <strong className="mono">{c.codigo}</strong> {c.nome}
                  </span>
                </div>
              )}
            />
            <button type="button" className="botao" onClick={adicionarDoenca}>
              Acrescentar
            </button>
          </div>
        )}
      </section>

      <section className="cartao">
        <div>
          <h2>Remédios</h2>
          <p className="secundario">Os remédios receitados. Para cada um com registro na Anvisa, o relatório de viabilidade sai já preenchido.</p>
        </div>
        {perfil.medicamentos.length > 0 && (
          <ul className="lista-itens">
            {perfil.medicamentos.map((m) => (
              <li key={m.id}>
                <span>
                  <strong>{m.nome}</strong> {m.principio_ativo && <span className="secundario">{frase(m.principio_ativo)}</span>}
                  <span className="secundario">
                    {" "}
                    · {m.numero_registro ? registroAnvisa(m.numero_registro) : <Etiqueta tom="alerta">Sem registro na Anvisa</Etiqueta>}
                    {m.codigo_cid && <> · para {m.codigo_cid}</>}
                  </span>
                </span>
                <span className="acoes">
                  {m.numero_registro && (
                    <Link
                      to={enderecoDoRelatorio({
                        registro: m.numero_registro,
                        cid: m.codigo_cid ?? perfil.doencas[0]?.codigo_cid ?? null,
                        uf: perfil.uf,
                        idadeMeses: perfil.idade_meses,
                        tipo: "judicial",
                        alc: false,
                      })}
                    >
                      Ver relatório
                    </Link>
                  )}
                  <button type="button" className="botao texto pequeno" onClick={() => executar(() => api.removerMedicamento(perfilId, m.id))}>
                    Remover
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {podeSaude && (
          <div className="formulario-perfil">
            {semRegistro ? (
              <div className="campo">
                <label htmlFor="remedio-nome">Nome do remédio</label>
                <input id="remedio-nome" maxLength={200} value={nomeImportado} onChange={(e) => setNomeImportado(e.target.value)} />
                <span className="dica">Para remédio importado, sem registro na Anvisa (Tema 500)</span>
              </div>
            ) : (
              <CampoDeBusca
                rotulo="Acrescentar remédio"
                dica="Nome comercial, princípio ativo ou nº de registro"
                placeholder="Ex.: Spinraza ou nusinersena"
                minimo={3}
                buscar={api.buscarMedicamentos}
                chave={(r) => r.numero_registro}
                texto={textoDoRegistro}
                escolhido={registro}
                aoEscolher={setRegistro}
                item={(r) => (
                  <div className="sugestao">
                    <span>
                      <strong>{r.nome_produto}</strong> <span className="secundario">{frase(r.principio_ativo)}</span>
                    </span>
                    <span className="secundario">
                      {registroAnvisa(r.numero_registro)} · {r.empresa}
                    </span>
                  </div>
                )}
              />
            )}
            <label className="caixa">
              <input type="checkbox" checked={semRegistro} onChange={(e) => setSemRegistro(e.target.checked)} />
              Não tem registro na Anvisa (importado)
            </label>
            {perfil.doencas.length > 0 && (
              <div className="campo campo-compacto">
                <label htmlFor="remedio-cid">Receitado para</label>
                <select id="remedio-cid" value={cidDoRemedio} onChange={(e) => setCidDoRemedio(e.target.value)}>
                  <option value="">Não informado</option>
                  {perfil.doencas.map((d) => (
                    <option key={d.id} value={d.codigo_cid}>
                      {d.codigo_cid} · {d.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="acoes">
              <button type="button" className="botao" onClick={adicionarRemedio}>
                Acrescentar remédio
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
