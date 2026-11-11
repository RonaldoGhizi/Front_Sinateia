import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./componentes/Layout";
import { Cadastro } from "./paginas/Cadastro";
import { Cids } from "./paginas/Cids";
import { Conta } from "./paginas/Conta";
import { Entrar } from "./paginas/Entrar";
import { FontesDeDados } from "./paginas/FontesDeDados";
import { NovaConsulta } from "./paginas/NovaConsulta";
import { PerfilPaciente } from "./paginas/PerfilPaciente";
import { Perfis } from "./paginas/Perfis";
import { Privacidade } from "./paginas/Privacidade";
import { Relatorio } from "./paginas/Relatorio";
import { ProvedorDeSessao, RequerLogin } from "./sessao";
import "./estilos.css";

createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    <BrowserRouter>
      <ProvedorDeSessao>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<NovaConsulta />} />
            <Route path="relatorio/:registro" element={<Relatorio />} />
            <Route path="cids" element={<Cids />} />
            <Route path="cids/:codigo" element={<Cids />} />
            <Route path="fontes" element={<FontesDeDados />} />
            <Route path="entrar" element={<Entrar />} />
            <Route path="cadastro" element={<Cadastro />} />
            <Route path="privacidade" element={<Privacidade />} />
            {/* Exigem conta. Os processos do DataJud entram aqui. */}
            <Route path="perfis" element={<RequerLogin><Perfis /></RequerLogin>} />
            <Route path="perfis/:id" element={<RequerLogin><PerfilPaciente /></RequerLogin>} />
            <Route path="conta" element={<RequerLogin><Conta /></RequerLogin>} />
            <Route path="*" element={<p>Página não encontrada.</p>} />
          </Route>
        </Routes>
      </ProvedorDeSessao>
    </BrowserRouter>
  </StrictMode>,
);
