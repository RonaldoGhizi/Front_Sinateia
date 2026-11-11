# Front-end do Sinatéia

React + TypeScript (Vite). Consome a API FastAPI do projeto: `/medicamentos`, `/cids` e `/fontes`.

## Telas

- **Nova consulta** (`/`): medicamento, CID, estado, idade e tipo de compra; consultas recentes (guardadas só neste navegador) e as fontes carregadas.
- **Relatório de viabilidade** (`/relatorio/<registro>?cid=&uf=&idade=&tipo=`): se o SUS fornece para o CID e a idade, registro na Anvisa, teto de preço por apresentação, conferência do seu preço contra o teto, alternativas do SUS para o CID e o que o advogado precisa (Tema 6 ou Tema 500). Imprime ou salva em PDF pelo navegador.
- **Medicamentos por CID** (`/cids`): busca a doença e mostra o que o SUS fornece para ela, com o teto em ação judicial no estado.
- **Fontes de dados** (`/fontes`): a versão em uso de cada base, como ela se atualiza e a última tentativa (com o erro, se houve). O administrador vê o botão **Enviar arquivo** em cada fonte, para a RENAME (que não tem link para baixar) ou quando o site de uma fonte mudar.
- **Entrar** (`/entrar`) e **Criar conta** (`/cadastro`), com o aceite dos termos e a autorização separada para dados de saúde.
- **Perfis de pacientes** (`/perfis`, `/perfis/<id>`): idade, estado, doenças e remédios de cada paciente; cada remédio com registro abre o relatório já preenchido. Na Nova consulta, quem entrou escolhe o paciente e o formulário se preenche.
- **Minha conta** (`/conta`): nome, senha, autorização dos dados de saúde, baixar os dados e excluir a conta.
- **Privacidade** (`/privacidade`): rascunho da política, para revisão de um advogado.

Perfis e Minha conta exigem conta (`RequerLogin` em `src/sessao.tsx`); o resto é aberto.

Processos (DataJud), Conitec e o PDF próprio ficam para depois.

## Rodar no Windows

Precisa do Node.js 20 ou mais novo (https://nodejs.org, versão LTS). Em um PowerShell, com a API rodando em outro (`uvicorn --factory sinateia.api.main:create_app --reload`):

```powershell
cd frontend
npm install
npm run dev
```

Abra http://localhost:5173. O Vite repassa `/api/...` para http://localhost:8000, então a API não precisa de CORS. Se a API estiver em outro endereço: `$env:SINATEIA_API_URL = "http://localhost:8001"` antes do `npm run dev`.

## Testes e build

```powershell
npm test         # regras do relatório (idade, caminho, teto) e formatação
npm run build    # confere os tipos e gera frontend/dist
```

## No servidor (Docker)

O `Dockerfile` compila o front e o serve com o [Caddy](https://caddyserver.com), que pede o certificado HTTPS sozinho e repassa `/api/...` para a API (como o Vite faz em desenvolvimento). As regras estão no `Caddyfile`; o domínio vem de `SINATEIA_DOMINIO` e o endereço da API de `SINATEIA_API` (padrão `api:8000`).

Quem sobe o site é o `compose.producao.yml` do repositório da API, que espera este repositório clonado ao lado dele, numa pasta `frontend`:

```
sinateia/        repositório da API (compose.producao.yml, .env)
frontend/        este repositório
```

Veja a seção "Hospedagem (Docker)" no README da API.
