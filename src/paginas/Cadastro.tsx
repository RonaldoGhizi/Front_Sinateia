import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api, ErroApi, type Papel } from "../api";
import { Aviso } from "../componentes/Etiqueta";
import { destinoSeguro, useSessao } from "../sessao";

export const PAPEIS: { valor: Papel; rotulo: string }[] = [
  { valor: "paciente", rotulo: "Paciente" },
  { valor: "familiar", rotulo: "Familiar ou cuidador" },
  { valor: "medico", rotulo: "Médico(a)" },
  { valor: "advogado", rotulo: "Advogado(a)" },
];
const SENHA_MINIMA = 10;

export function rotuloDoPapel(papel: Papel): string {
  return PAPEIS.find((p) => p.valor === papel)?.rotulo ?? { equipe: "Equipe", admin: "Administração" }[papel as string] ?? papel;
}

export function Cadastro() {
  const { conta, definirConta } = useSessao();
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const destino = destinoSeguro(parametros.get("voltar"));
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<Papel>("paciente");
  const [termos, setTermos] = useState(false);
  const [saude, setSaude] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (conta) return <Navigate to={destino} replace />;

  async function cadastrar(evento: FormEvent) {
    evento.preventDefault();
    if (senha.length < SENHA_MINIMA) return setErro(`A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`);
    if (!termos) return setErro("Para criar a conta, aceite os termos de uso e a política de privacidade.");
    setEnviando(true);
    setErro(null);
    try {
      definirConta(await api.cadastrar({ nome, email, senha, papel, aceite_termos: termos, consentimento_saude: saude }));
      navegar(destino, { replace: true });
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Erro inesperado.");
      setEnviando(false);
    }
  }

  return (
    <>
      <header className="cabecalho">
        <h1>Criar conta</h1>
        <p>Guarde os pacientes que você acompanha, com as doenças e os remédios de cada um, para consultar mais rápido.</p>
      </header>
      <form className="cartao formulario-estreito" onSubmit={cadastrar} noValidate>
        <div className="campo">
          <label htmlFor="nome">Seu nome</label>
          <input id="nome" autoComplete="name" required maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            autoComplete="new-password"
            required
            minLength={SENHA_MINIMA}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <span className="dica">Pelo menos {SENHA_MINIMA} caracteres. Uma frase curta é mais fácil de lembrar.</span>
        </div>
        <fieldset className="campo">
          <legend>Você é</legend>
          <div className="segmentos">
            {PAPEIS.map((p) => (
              <label key={p.valor} className={papel === p.valor ? "segmento ativo" : "segmento"}>
                <input type="radio" name="papel" value={p.valor} checked={papel === p.valor} onChange={() => setPapel(p.valor)} />
                {p.rotulo}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="caixa caixa-texto">
          <input type="checkbox" checked={termos} onChange={(e) => setTermos(e.target.checked)} />
          <span>
            Li e aceito os termos de uso e a{" "}
            <Link to="/privacidade" target="_blank">
              política de privacidade
            </Link>
            .
          </span>
        </label>
        <div className="consentimento">
          <label className="caixa caixa-texto">
            <input type="checkbox" checked={saude} onChange={(e) => setSaude(e.target.checked)} />
            <span>
              <strong>Autorizo guardar dados de saúde</strong> (doenças e remédios) dos perfis que eu cadastrar.
            </span>
          </label>
          <p className="nota">
            Pela LGPD (art. 11), dado de saúde só pode ser guardado com esta autorização específica. Ele fica cifrado, é usado só para as
            suas consultas e você pode revogar quando quiser em Minha conta, o que apaga esses dados. Sem autorizar, você usa a conta só
            com nome, idade e estado dos pacientes.
          </p>
        </div>

        {erro && <Aviso>{erro}</Aviso>}
        <div className="acoes">
          <button type="submit" className="botao primario" disabled={enviando}>
            {enviando ? "Criando…" : "Criar conta"}
          </button>
          <Link className="botao texto" to={`/entrar${parametros.size ? `?${parametros}` : ""}`}>
            Já tenho conta
          </Link>
        </div>
      </form>
    </>
  );
}
