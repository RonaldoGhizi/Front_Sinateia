import { type FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, type Cid, type Perfil, type Registro } from "../api";
import { TIPOS_DE_COMPRA, tipoDeCompra, type TipoDeCompra } from "../analise";
import { CampoDeBusca } from "../componentes/CampoDeBusca";
import { Etiqueta } from "../componentes/Etiqueta";
import { Fontes } from "../componentes/Fontes";
import { frase, idade, nomeDaUf, registroAnvisa, UFS, UFS_ALC } from "../formato";
import { enderecoDoRelatorio, guardarConsulta, lerConsultas } from "../recentes";
import { useSessao } from "../sessao";
import { useCarregar } from "../useCarregar";

const textoDoRegistro = (r: Registro) => r.nome_produto;
const textoDoCid = (c: Cid) => `${c.codigo} · ${c.nome ?? ""}`;

export function NovaConsulta() {
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const cidInicial = parametros.get("cid");
  const [medicamento, setMedicamento] = useState<Registro | null>(null);
  const [cid, setCid] = useState<Cid | null>(cidInicial ? { codigo: cidInicial, nome: parametros.get("cid_nome") } : null);
  const [uf, setUf] = useState(parametros.get("uf") ?? "");
  const [anos, setAnos] = useState("");
  const [meses, setMeses] = useState("");
  const [tipo, setTipo] = useState<TipoDeCompra>("judicial");
  const [alc, setAlc] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const consultas = lerConsultas();
  const { conta } = useSessao();
  const perfis = useCarregar(conta ? (sinal) => api.perfis(sinal) : null, [conta?.id]);
  const [perfilId, setPerfilId] = useState("");

  function usarPerfil(id: string) {
    setPerfilId(id);
    const perfil = perfis?.estado === "pronto" ? perfis.dados.find((p: Perfil) => String(p.id) === id) : undefined;
    if (!perfil) return;
    const doenca = perfil.doencas[0];
    setCid(doenca ? { codigo: doenca.codigo_cid, nome: doenca.nome } : null);
    setUf(perfil.uf ?? "");
    setAnos(perfil.idade_meses === null ? "" : String(Math.floor(perfil.idade_meses / 12)));
    setMeses(perfil.idade_meses === null ? "" : String(perfil.idade_meses % 12));
  }

  function consultar(evento: FormEvent) {
    evento.preventDefault();
    if (!medicamento) {
      setErro("Escolha o medicamento na lista de sugestões.");
      return;
    }
    const idadeMeses = anos === "" && meses === "" ? null : Number(anos || 0) * 12 + Number(meses || 0);
    const consulta = {
      registro: medicamento.numero_registro,
      nome: medicamento.nome_produto,
      principio: medicamento.principio_ativo,
      cid: cid?.codigo ?? null,
      uf: uf || null,
      idadeMeses,
      tipo,
      alc: alc && UFS_ALC.has(uf),
      quando: new Date().toISOString(),
    };
    guardarConsulta(consulta);
    navegar(enderecoDoRelatorio(consulta));
  }

  function limpar() {
    setMedicamento(null);
    setCid(null);
    setUf("");
    setAnos("");
    setMeses("");
    setTipo("judicial");
    setAlc(false);
    setErro(null);
    setPerfilId("");
  }

  return (
    <>
      <header className="cabecalho">
        <h1>Nova consulta</h1>
        <p>Medicamento, doença e estado: o Sinatéia diz se o SUS fornece, o preço máximo e o caminho na Justiça.</p>
      </header>

      <form className="cartao" onSubmit={consultar} noValidate>
        <div>
          <h2>Dados da consulta</h2>
          <p className="secundario">Preencha como está na receita médica.</p>
        </div>
        {perfis?.estado === "pronto" && perfis.dados.length > 0 && (
          <div className="campo campo-compacto formulario-estreito">
            <label htmlFor="perfil">Paciente</label>
            <select id="perfil" value={perfilId} onChange={(e) => usarPerfil(e.target.value)}>
              <option value="">Preencher à mão</option>
              {perfis.dados.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            <span className="dica">Preenche doença, estado e idade com os dados do perfil</span>
          </div>
        )}
        <div className="grade-2">
          <CampoDeBusca
            rotulo="Medicamento"
            dica="Nome comercial, princípio ativo ou nº de registro"
            placeholder="Ex.: Spinraza ou nusinersena"
            minimo={3}
            buscar={api.buscarMedicamentos}
            chave={(r) => r.numero_registro}
            texto={textoDoRegistro}
            escolhido={medicamento}
            aoEscolher={(r) => {
              setMedicamento(r);
              setErro(null);
            }}
            item={(r) => (
              <div className="sugestao">
                <span>
                  <strong>{r.nome_produto}</strong> <span className="secundario">{frase(r.principio_ativo)}</span>
                </span>
                <span className="secundario">
                  {registroAnvisa(r.numero_registro)} · {r.empresa}{" "}
                  {!r.valido && <Etiqueta tom="perigo">{frase(r.situacao) || "Não válido"}</Etiqueta>}
                </span>
              </div>
            )}
          />
          <CampoDeBusca
            rotulo="Doença (CID)"
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
        </div>

        <div className="linha-campos">
          <div className="campo">
            <label htmlFor="uf">Estado do paciente</label>
            <select id="uf" value={uf} onChange={(e) => setUf(e.target.value)}>
              <option value="">Escolha o estado</option>
              {UFS.map(([sigla, nome]) => (
                <option key={sigla} value={sigla}>
                  {nome} ({sigla})
                </option>
              ))}
            </select>
            <span className="dica">Define o ICMS do preço máximo</span>
          </div>
          <fieldset className="campo">
            <legend>Idade do paciente</legend>
            <div className="idade">
              <input aria-label="Anos" type="number" min={0} max={130} inputMode="numeric" value={anos} onChange={(e) => setAnos(e.target.value)} />
              <span>anos</span>
              <input aria-label="Meses" type="number" min={0} max={11} inputMode="numeric" value={meses} onChange={(e) => setMeses(e.target.value)} />
              <span>meses</span>
            </div>
            <span className="dica">A cobertura do SUS varia por idade</span>
          </fieldset>
          <fieldset className="campo">
            <legend>Tipo de compra</legend>
            <div className="segmentos">
              {TIPOS_DE_COMPRA.map((t) => (
                <label key={t.valor} className={tipo === t.valor ? "segmento ativo" : "segmento"}>
                  <input type="radio" name="tipo" value={t.valor} checked={tipo === t.valor} onChange={() => setTipo(t.valor)} />
                  {t.rotulo}
                </label>
              ))}
            </div>
            <span className="dica">Teto: {tipoDeCompra(tipo).teto}</span>
          </fieldset>
        </div>

        {UFS_ALC.has(uf) && (
          <label className="caixa">
            <input type="checkbox" checked={alc} onChange={(e) => setAlc(e.target.checked)} />
            Comprador na Zona Franca de Manaus ou numa área de livre comércio (preço ALC da CMED)
          </label>
        )}

        {erro && <p className="erro-campo" role="alert">{erro}</p>}

        <div className="acoes">
          <button type="submit" className="botao primario">
            Consultar
          </button>
          <Link className="botao" to="/cids">
            Ver medicamentos por CID
          </Link>
          <button type="button" className="botao texto" onClick={limpar}>
            Limpar campos
          </button>
        </div>
      </form>

      <section className="cartao">
        <div>
          <h2>Consultas recentes</h2>
          <p className="secundario">As últimas consultas feitas neste navegador.</p>
        </div>
        {consultas.length === 0 ? (
          <p className="secundario">Nenhuma consulta ainda.</p>
        ) : (
          <div className="tabela-rolagem">
            <table>
              <thead>
                <tr>
                  <th>Medicamento</th>
                  <th>CID</th>
                  <th>UF</th>
                  <th>Idade</th>
                  <th>Compra</th>
                  <th>Data</th>
                  <th>
                    <span className="sr">Relatório</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {consultas.map((c) => (
                  <tr key={`${c.registro}-${c.cid}-${c.uf}-${c.idadeMeses}-${c.quando}`}>
                    <td>
                      <strong>{c.nome}</strong>
                      <div className="secundario">{frase(c.principio)}</div>
                    </td>
                    <td className="mono">{c.cid ?? "—"}</td>
                    <td title={c.uf ? nomeDaUf(c.uf) : undefined}>{c.uf ?? "—"}</td>
                    <td>{c.idadeMeses === null ? "—" : idade(c.idadeMeses)}</td>
                    <td>{tipoDeCompra(c.tipo).rotulo}</td>
                    <td>{new Date(c.quando).toLocaleDateString("pt-BR")}</td>
                    <td>
                      <Link to={enderecoDoRelatorio(c)}>Abrir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="cartao">
        <div>
          <h2>Fontes de dados</h2>
          <p className="secundario">Cada relatório mostra a versão usada.</p>
        </div>
        <Fontes />
      </section>
    </>
  );
}
