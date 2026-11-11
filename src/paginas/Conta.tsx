import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ErroApi } from "../api";
import { Aviso, Etiqueta } from "../componentes/Etiqueta";
import { useSessao } from "../sessao";
import { rotuloDoPapel } from "./Cadastro";

type Retorno = { tom: "ok" | "perigo"; texto: string } | null;

function mensagem(erro: unknown): string {
  return erro instanceof ErroApi ? erro.message : "Erro inesperado.";
}

export function Conta() {
  const { conta, definirConta, sair } = useSessao();
  const navegar = useNavigate();
  const [nome, setNome] = useState(conta?.nome ?? "");
  const [retornoDados, setRetornoDados] = useState<Retorno>(null);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [retornoSenha, setRetornoSenha] = useState<Retorno>(null);
  const [retornoSaude, setRetornoSaude] = useState<Retorno>(null);
  const [senhaExclusao, setSenhaExclusao] = useState("");
  const [retornoExclusao, setRetornoExclusao] = useState<Retorno>(null);

  if (!conta) return null;

  async function salvarNome(evento: FormEvent) {
    evento.preventDefault();
    try {
      definirConta(await api.alterarConta(nome));
      setRetornoDados({ tom: "ok", texto: "Nome atualizado." });
    } catch (e) {
      setRetornoDados({ tom: "perigo", texto: mensagem(e) });
    }
  }

  async function trocarSenha(evento: FormEvent) {
    evento.preventDefault();
    try {
      await api.trocarSenha(senhaAtual, novaSenha);
      setSenhaAtual("");
      setNovaSenha("");
      setRetornoSenha({ tom: "ok", texto: "Senha trocada. As sessões em outros aparelhos foram encerradas." });
    } catch (e) {
      setRetornoSenha({ tom: "perigo", texto: mensagem(e) });
    }
  }

  async function alternarSaude() {
    if (
      conta!.consentimento_saude &&
      !window.confirm("Revogar apaga as doenças e os remédios de todos os perfis. Os perfis continuam. Revogar mesmo?")
    )
      return;
    try {
      const atualizada = await api.consentimentoSaude(!conta!.consentimento_saude);
      definirConta(atualizada);
      setRetornoSaude({
        tom: "ok",
        texto: atualizada.consentimento_saude ? "Autorização registrada." : "Autorização revogada e dados de saúde apagados.",
      });
    } catch (e) {
      setRetornoSaude({ tom: "perigo", texto: mensagem(e) });
    }
  }

  async function excluir(evento: FormEvent) {
    evento.preventDefault();
    if (!window.confirm("Excluir a conta apaga todos os perfis, doenças e remédios. Não tem volta. Excluir mesmo?")) return;
    try {
      await api.excluirConta(senhaExclusao);
      definirConta(null);
      navegar("/", { replace: true });
    } catch (e) {
      setRetornoExclusao({ tom: "perigo", texto: mensagem(e) });
    }
  }

  const aceiteSaude = [...conta.consentimentos].reverse().find((c) => c.finalidade === "dados_saude" && !c.revogado_em);

  return (
    <>
      <header className="cabecalho cabecalho-acoes">
        <div className="cabecalho">
          <h1>Minha conta</h1>
          <p>
            {conta.email} · {rotuloDoPapel(conta.papel)}
          </p>
        </div>
        <button
          type="button"
          className="botao"
          onClick={async () => {
            await sair();
            navegar("/", { replace: true });
          }}
        >
          Sair
        </button>
      </header>

      <form className="cartao formulario-estreito" onSubmit={salvarNome}>
        <h2>Seus dados</h2>
        <div className="campo">
          <label htmlFor="nome">Nome</label>
          <input id="nome" required maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        {retornoDados && <Aviso tom={retornoDados.tom}>{retornoDados.texto}</Aviso>}
        <div className="acoes">
          <button type="submit" className="botao primario">
            Salvar
          </button>
        </div>
      </form>

      <section className="cartao">
        <div className="cartao-titulo">
          <div>
            <h2>Dados de saúde</h2>
            <p className="secundario">Doenças e remédios dos perfis. Ficam cifrados e só são guardados com a sua autorização (LGPD, art. 11).</p>
          </div>
          {conta.consentimento_saude ? <Etiqueta tom="ok">Autorizado</Etiqueta> : <Etiqueta tom="neutro">Não autorizado</Etiqueta>}
        </div>
        {aceiteSaude && <p className="nota">Autorizado em {new Date(aceiteSaude.aceito_em).toLocaleString("pt-BR")}.</p>}
        {retornoSaude && <Aviso tom={retornoSaude.tom}>{retornoSaude.texto}</Aviso>}
        <div className="acoes">
          <button type="button" className={conta.consentimento_saude ? "botao" : "botao primario"} onClick={alternarSaude}>
            {conta.consentimento_saude ? "Revogar e apagar dados de saúde" : "Autorizar dados de saúde"}
          </button>
        </div>
      </section>

      <form className="cartao formulario-estreito" onSubmit={trocarSenha}>
        <h2>Trocar senha</h2>
        <div className="campo">
          <label htmlFor="senha-atual">Senha atual</label>
          <input id="senha-atual" type="password" autoComplete="current-password" required value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="nova-senha">Nova senha</label>
          <input id="nova-senha" type="password" autoComplete="new-password" required minLength={10} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
          <span className="dica">Pelo menos 10 caracteres.</span>
        </div>
        {retornoSenha && <Aviso tom={retornoSenha.tom}>{retornoSenha.texto}</Aviso>}
        <div className="acoes">
          <button type="submit" className="botao primario">
            Trocar senha
          </button>
        </div>
      </form>

      <section className="cartao">
        <h2>Seus dados, seus direitos</h2>
        <p className="secundario">Baixe tudo o que o Sinatéia guarda sobre você e os seus perfis, num arquivo JSON.</p>
        <div className="acoes">
          <a className="botao" href={api.enderecoExportacao} download>
            Baixar meus dados
          </a>
        </div>
      </section>

      <form className="cartao formulario-estreito zona-de-perigo" onSubmit={excluir}>
        <h2>Excluir conta</h2>
        <p className="secundario">Apaga a conta, todos os perfis, doenças e remédios. Não tem volta.</p>
        <div className="campo">
          <label htmlFor="senha-exclusao">Confirme com a sua senha</label>
          <input
            id="senha-exclusao"
            type="password"
            autoComplete="current-password"
            required
            value={senhaExclusao}
            onChange={(e) => setSenhaExclusao(e.target.value)}
          />
        </div>
        {retornoExclusao && <Aviso>{retornoExclusao.texto}</Aviso>}
        <div className="acoes">
          <button type="submit" className="botao perigo">
            Excluir minha conta
          </button>
        </div>
      </form>
    </>
  );
}
