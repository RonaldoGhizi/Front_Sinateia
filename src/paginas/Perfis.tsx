import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type DadosDoPerfil, ErroApi, type Perfil } from "../api";
import { Aviso, Carregando } from "../componentes/Etiqueta";
import { idade, nomeDaUf, UFS } from "../formato";
import { useSessao } from "../sessao";
import { useCarregar } from "../useCarregar";

export function Perfis() {
  const { conta } = useSessao();
  const navegar = useNavigate();
  const perfis = useCarregar((sinal) => api.perfis(sinal), []);
  const [criando, setCriando] = useState(false);

  return (
    <>
      <header className="cabecalho cabecalho-acoes">
        <div className="cabecalho">
          <h1>Perfis de pacientes</h1>
          <p>Cada perfil guarda a idade, o estado, as doenças e os remédios de um paciente, para preencher as consultas.</p>
        </div>
        {!criando && (
          <button type="button" className="botao primario" onClick={() => setCriando(true)}>
            Novo perfil
          </button>
        )}
      </header>

      {conta && !conta.consentimento_saude && (
        <Aviso tom="alerta">
          Para guardar doenças e remédios nos perfis, autorize os dados de saúde em <Link to="/conta">Minha conta</Link>.
        </Aviso>
      )}

      {criando && (
        <section className="cartao">
          <h2>Novo perfil</h2>
          <FormularioDoPerfil
            aoSalvar={async (dados) => {
              const perfil = await api.criarPerfil(dados);
              navegar(`/perfis/${perfil.id}`);
            }}
            aoCancelar={() => setCriando(false)}
            rotuloSalvar="Criar perfil"
          />
        </section>
      )}

      {perfis?.estado === "carregando" && <Carregando />}
      {perfis?.estado === "erro" && <Aviso>{perfis.mensagem}</Aviso>}
      {perfis?.estado === "pronto" &&
        (perfis.dados.length === 0 ? (
          !criando && (
            <section className="cartao">
              <p className="secundario">Nenhum perfil ainda. Crie um para cada paciente que você acompanha (você mesmo, um filho, um cliente).</p>
            </section>
          )
        ) : (
          <div className="lista-perfis">
            {perfis.dados.map((p) => (
              <CartaoDoPerfil key={p.id} perfil={p} />
            ))}
          </div>
        ))}
    </>
  );
}

function CartaoDoPerfil({ perfil }: { perfil: Perfil }) {
  return (
    <Link className="cartao cartao-link" to={`/perfis/${perfil.id}`}>
      <h2>{perfil.nome}</h2>
      <p className="secundario">
        {[perfil.idade_meses === null ? null : idade(perfil.idade_meses), perfil.uf ? nomeDaUf(perfil.uf) : null].filter(Boolean).join(" · ") ||
          "Sem idade nem estado"}
      </p>
      <p className="secundario">
        {perfil.doencas.length ? perfil.doencas.map((d) => d.codigo_cid).join(", ") : "Nenhuma doença"} ·{" "}
        {perfil.medicamentos.length === 1 ? "1 remédio" : `${perfil.medicamentos.length} remédios`}
      </p>
    </Link>
  );
}

export function FormularioDoPerfil({
  inicial,
  aoSalvar,
  aoCancelar,
  rotuloSalvar,
}: {
  inicial?: DadosDoPerfil;
  aoSalvar: (dados: DadosDoPerfil) => Promise<void>;
  aoCancelar?: () => void;
  rotuloSalvar: string;
}) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [nascimento, setNascimento] = useState(inicial?.data_nascimento ?? "");
  const [uf, setUf] = useState(inicial?.uf ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const hoje = new Date().toISOString().slice(0, 10);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (!nome.trim()) return setErro("Dê um nome ao perfil.");
    setEnviando(true);
    setErro(null);
    try {
      await aoSalvar({ nome: nome.trim(), data_nascimento: nascimento || null, uf: uf || null });
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Erro inesperado.");
    }
    setEnviando(false);
  }

  return (
    <form className="formulario-perfil" onSubmit={salvar} noValidate>
      <div className="linha-campos">
        <div className="campo">
          <label htmlFor="perfil-nome">Nome do paciente</label>
          <input id="perfil-nome" required maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />
          <span className="dica">Pode ser um apelido, se preferir</span>
        </div>
        <div className="campo">
          <label htmlFor="perfil-nascimento">Data de nascimento</label>
          <input id="perfil-nascimento" type="date" min="1900-01-01" max={hoje} value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
          <span className="dica">A idade é calculada a cada consulta</span>
        </div>
        <div className="campo">
          <label htmlFor="perfil-uf">Estado</label>
          <select id="perfil-uf" value={uf} onChange={(e) => setUf(e.target.value)}>
            <option value="">Não informado</option>
            {UFS.map(([sigla, nomeUf]) => (
              <option key={sigla} value={sigla}>
                {nomeUf} ({sigla})
              </option>
            ))}
          </select>
          <span className="dica">Define o ICMS do preço máximo</span>
        </div>
      </div>
      {erro && <Aviso>{erro}</Aviso>}
      <div className="acoes">
        <button type="submit" className="botao primario" disabled={enviando}>
          {rotuloSalvar}
        </button>
        {aoCancelar && (
          <button type="button" className="botao texto" onClick={aoCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
