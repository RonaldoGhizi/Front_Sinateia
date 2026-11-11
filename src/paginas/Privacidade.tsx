export function Privacidade() {
  return (
    <>
      <header className="cabecalho">
        <h1>Privacidade e termos de uso</h1>
        <p>Versão de 30/10/2026. Rascunho: precisa da revisão de um advogado antes de o Sinatéia abrir ao público.</p>
      </header>
      <section className="cartao texto-corrido">
        <h2>O que o Sinatéia guarda</h2>
        <ul>
          <li>
            <strong>Para consultar medicamentos, nada.</strong> A consulta é aberta e não pede conta. As consultas recentes ficam só no seu
            navegador.
          </li>
          <li>
            <strong>Na conta:</strong> seu nome, e-mail, o tipo de usuário e a senha, guardada só como resumo criptográfico (ninguém consegue
            lê-la).
          </li>
          <li>
            <strong>Em cada perfil de paciente:</strong> nome, data de nascimento (para calcular a idade que o SUS usa) e estado (para o
            ICMS do preço máximo).
          </li>
          <li>
            <strong>Dados de saúde</strong> (doenças e remédios), só se você autorizar. Eles ficam cifrados no banco de dados.
          </li>
        </ul>

        <h2>Para que</h2>
        <p>
          Só para preencher e agilizar as suas consultas: saber se o SUS fornece o remédio para a doença, o preço máximo e o caminho na
          Justiça. Os dados não são vendidos nem usados para propaganda.
        </p>

        <h2>Seus direitos (LGPD, art. 18)</h2>
        <ul>
          <li>Ver e baixar todos os seus dados (Minha conta → Baixar meus dados).</li>
          <li>Corrigir qualquer dado nos perfis ou na conta.</li>
          <li>Revogar a autorização dos dados de saúde, o que apaga doenças e remédios de todos os perfis.</li>
          <li>Excluir a conta, o que apaga tudo de uma vez.</li>
        </ul>

        <h2>Segurança</h2>
        <p>
          A sessão usa um cookie que o código da página não consegue ler. Depois de cinco senhas erradas seguidas, a conta fica bloqueada
          por 15 minutos. Trocar a senha encerra as sessões abertas em outros aparelhos.
        </p>

        <h2>Processos judiciais</h2>
        <p>Quando o Sinatéia mostrar processos do DataJud, essa parte vai exigir conta.</p>
      </section>
    </>
  );
}
