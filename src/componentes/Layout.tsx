import { NavLink, Outlet } from "react-router-dom";
import { useSessao } from "../sessao";

const MENU = [
  { para: "/", rotulo: "Nova consulta", fim: true },
  { para: "/cids", rotulo: "Doenças (CID)", fim: false },
  { para: "/fontes", rotulo: "Fontes de dados", fim: false },
];

export function Layout() {
  const { conta } = useSessao();
  const classe = ({ isActive }: { isActive: boolean }) => (isActive ? "menu ativo" : "menu");
  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca">
          <span className="marca-nome">Sinatéia</span>
          <span className="marca-sub">Viabilidade de medicamentos</span>
        </div>
        <nav aria-label="Principal">
          {MENU.map((m) => (
            <NavLink key={m.para} to={m.para} end={m.fim} className={({ isActive }) => (isActive ? "menu ativo" : "menu")}>
              {m.rotulo}
            </NavLink>
          ))}
        </nav>
        {conta !== undefined && (
          <nav aria-label="Conta" className="menu-conta">
            {conta ? (
              <>
                <NavLink to="/perfis" className={classe}>
                  Perfis de pacientes
                </NavLink>
                <NavLink to="/conta" className={classe}>
                  <span className="menu-usuario">
                    Minha conta
                    <span className="menu-email">{conta.email}</span>
                  </span>
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/entrar" className={classe}>
                  Entrar
                </NavLink>
                <NavLink to="/cadastro" className={classe}>
                  Criar conta
                </NavLink>
              </>
            )}
          </nav>
        )}
        <p className="lateral-rodape">Em breve: processos (DataJud) e relatório em PDF.</p>
      </aside>
      <main className="conteudo">
        <div className="pagina">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
