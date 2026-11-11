import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api, ErroApi } from "../api";
import { Aviso } from "../componentes/Etiqueta";
import { destinoSeguro, useSessao } from "../sessao";

export function Entrar() {
  const { conta, definirConta } = useSessao();
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const destino = destinoSeguro(parametros.get("voltar"));
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (conta) return <Navigate to={destino} replace />;

  async function entrar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      definirConta(await api.entrar(email, senha));
      navegar(destino, { replace: true });
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Erro inesperado.");
      setEnviando(false);
    }
  }

  return (
    <>
      <header className="cabecalho">
        <h1>Entrar</h1>
        <p>A consulta de medicamentos é aberta. A conta serve para guardar os perfis dos pacientes.</p>
      </header>
      <form className="cartao formulario-estreito" onSubmit={entrar}>
        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="senha">Senha</label>
          <input id="senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        {erro && <Aviso>{erro}</Aviso>}
        <div className="acoes">
          <button type="submit" className="botao primario" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
          <Link className="botao texto" to={`/cadastro${parametros.size ? `?${parametros}` : ""}`}>
            Criar conta
          </Link>
        </div>
      </form>
    </>
  );
}
