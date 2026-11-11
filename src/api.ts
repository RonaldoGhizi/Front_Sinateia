// Cliente da API do Sinatéia. Os tipos espelham src/sinateia/api/schemas.py.
// Valores em reais e alíquotas chegam como texto ("240000.00"), como o Decimal do Python.

export type Decimal = string;

export interface Fonte {
  fonte: string;
  arquivo: string;
  linhas: number;
  criada_em: string;
}

/** Última tentativa de atualizar uma fonte (GET /fontes/atualizacoes). */
export interface Atualizacao {
  situacao: "carregada" | "sem_novidade" | "recusada" | "erro";
  gatilho: "agendador" | "comando" | "envio";
  iniciada_em: string;
  terminada_em: string | null;
  origem: string | null;
  arquivo: string | null;
  linhas: number | null;
  mensagem: string | null;
}

export interface SituacaoFonte {
  fonte: string;
  /** Nome no `sinateia atualizar` e no envio de arquivo: anvisa, cmed, sigtap... */
  grupo: string;
  titulo: string;
  automatica: boolean;
  a_cada_dias: number | null;
  ultima: Atualizacao | null;
}

export interface ResultadoEnvio {
  situacao: "carregada" | "sem_novidade";
  mensagem: string;
  linhas: Record<string, number>;
}

export interface Registro {
  numero_registro: string;
  nome_produto: string;
  principio_ativo: string | null;
  empresa: string | null;
  situacao: string | null;
  valido: boolean;
  vencimento: string | null;
  categoria_regulatoria: string | null;
  classe_terapeutica: string | null;
}

export interface PrecoMaximo {
  uf: string | null;
  alc: boolean;
  aliquota_icms: Decimal;
  aliquota_icms_publica: Decimal;
  judicial: Decimal | null;
  compra_publica: Decimal | null;
  fabrica: Decimal | null;
  consumidor: Decimal | null;
  observacoes: string[];
}

export interface Apresentacao {
  registro: string;
  codigo_ggrem: string | null;
  ean: string | null;
  produto: string;
  apresentacao: string;
  laboratorio: string | null;
  cap: boolean | null;
  restricao_hospitalar: boolean | null;
  confaz_87: boolean | null;
  icms_0: boolean | null;
  preco_maximo: PrecoMaximo | null;
}

export interface Cid {
  codigo: string;
  nome: string | null;
}

export interface ProcedimentoSus {
  codigo: string;
  nome: string;
  componente: string | null;
  forma_organizacao: string | null;
  sexo: string | null;
  idade_minima_meses: number | null;
  idade_maxima_meses: number | null;
  valor_sigtap: Decimal | null;
  cids: Cid[];
}

export interface MedicamentoSus {
  substancia: string;
  procedimentos: ProcedimentoSus[];
  registros_anvisa: Registro[];
  total_registros_anvisa: number;
}

export interface CidDetalhe extends Cid {
  medicamentos_sus: MedicamentoSus[];
  observacoes: string[];
}

export type Veredito =
  | "fornece_para_o_cid"
  | "fornece_outro_cid"
  | "fornece"
  | "incorporado"
  | "nao_incorporado"
  | "excluido"
  | "nao_consta"
  | "indeterminado";

export interface ItemRename {
  medicamento: string;
  concentracao: string | null;
  forma_farmaceutica: string | null;
  componentes: ComponenteRename[];
  componente_original: string | null;
  grupo: string | null;
  modalidade: string | null;
  codigo_atc: string | null;
  observacoes: string | null;
}

export type ComponenteRename = "basico" | "estrategico" | "especializado" | "oncologico" | "hospitalar" | "insumo" | "outro";

export interface LinhaPcdt {
  codigo_cid: string;
  medicamento: string;
  pcdt: string | null;
  portaria: string | null;
}

export interface RecomendacaoConitec {
  tecnologia: string;
  indicacao: string | null;
  tipo_demanda: string | null;
  decisao: "incorporado" | "nao_incorporado" | "excluido" | "outra";
  decisao_original: string | null;
  data_decisao: string | null;
  portaria: string | null;
  relatorio: string | null;
}

export interface CoberturaSus {
  veredito: Veredito;
  resumo: string;
  rename: ItemRename[];
  pcdt: LinhaPcdt[];
  conitec: RecomendacaoConitec[];
  fontes_consultadas: string[];
  fontes_ausentes: string[];
  observacoes: string[];
}

export interface Medicamento extends Registro {
  apresentacoes: Apresentacao[];
  sus: ProcedimentoSus[] | null;
  fornecido_pelo_sus_para_o_cid: boolean | null;
  observacoes_sus: string[];
  cobertura_sus: CoberturaSus;
}

export interface FarmaciaComEstoque {
  cnes: string;
  nome: string | null;
  municipio: string | null;
  endereco: string | null;
  telefone: string | null;
  quantidade: Decimal;
  validade_mais_proxima: string | null;
  data_posicao: string | null;
  programas: string[];
}

export interface EstoqueDoCodigo {
  codigo_catmat: string;
  descricao: string | null;
  quantidade_total: Decimal;
  farmacias: FarmaciaComEstoque[];
}

export interface EstoqueSus {
  uf: string;
  codigos: EstoqueDoCodigo[];
  codigos_nao_consultados: string[];
  observacoes: string[];
}

export type Papel = "paciente" | "familiar" | "medico" | "advogado" | "equipe" | "admin";

export interface ConsentimentoRegistrado {
  finalidade: "termos" | "dados_saude";
  versao: string;
  aceito_em: string;
  revogado_em: string | null;
}

export interface Conta {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
  criado_em: string;
  consentimento_saude: boolean;
  consentimentos: ConsentimentoRegistrado[];
}

export interface Cadastro {
  nome: string;
  email: string;
  senha: string;
  papel: Papel;
  aceite_termos: boolean;
  consentimento_saude: boolean;
}

export interface DoencaDoPerfil {
  id: number;
  codigo_cid: string;
  nome: string | null;
}

export interface MedicamentoDoPerfil {
  id: number;
  nome: string;
  numero_registro: string | null;
  principio_ativo: string | null;
  codigo_cid: string | null;
}

export interface Perfil {
  id: number;
  nome: string;
  data_nascimento: string | null;
  idade_meses: number | null;
  uf: string | null;
  doencas: DoencaDoPerfil[];
  medicamentos: MedicamentoDoPerfil[];
}

export interface DadosDoPerfil {
  nome: string;
  data_nascimento: string | null;
  uf: string | null;
}

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

const BASE = import.meta.env.VITE_API_URL ?? "/api";

async function obter<T>(caminho: string, parametros: Record<string, string | number | boolean | undefined> = {}, sinal?: AbortSignal): Promise<T> {
  const consulta = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== "") consulta.set(chave, String(valor));
  }
  const url = `${BASE}${caminho}${consulta.size ? `?${consulta}` : ""}`;
  let resposta: Response;
  try {
    resposta = await fetch(url, { signal: sinal, credentials: "same-origin", headers: { Accept: "application/json" } });
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === "AbortError") throw erro;
    throw new ErroApi(0, "Não foi possível falar com a API. Confira se o uvicorn está rodando na porta 8000.");
  }
  if (!resposta.ok) throw new ErroApi(resposta.status, await mensagemDeErro(resposta));
  return resposta.json() as Promise<T>;
}

/** POST, PUT, PATCH e DELETE com corpo JSON. O cookie de sessão vai junto (mesma origem). */
async function enviar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      method: metodo,
      credentials: "same-origin",
      headers: { Accept: "application/json", ...(corpo === undefined ? {} : { "Content-Type": "application/json" }) },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ErroApi(0, "Não foi possível falar com a API. Confira se o uvicorn está rodando na porta 8000.");
  }
  if (!resposta.ok) throw new ErroApi(resposta.status, await mensagemDeErro(resposta));
  return (resposta.status === 204 ? undefined : await resposta.json()) as T;
}

async function mensagemDeErro(resposta: Response): Promise<string> {
  try {
    const corpo = await resposta.json();
    if (typeof corpo.detail === "string") return corpo.detail;
    if (Array.isArray(corpo.detail)) return corpo.detail.map((d: { msg: string }) => d.msg).join("; ");
  } catch {
    // Resposta sem JSON: fica a mensagem genérica.
  }
  if (resposta.status >= 500) return "A API respondeu com erro. Veja o terminal do uvicorn.";
  return `A API respondeu ${resposta.status}.`;
}

/** Envia um arquivo cru (application/octet-stream), como a API de envio de fontes espera. */
async function enviarArquivo<T>(caminho: string, parametros: Record<string, string>, arquivo: Blob): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${caminho}?${new URLSearchParams(parametros)}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json", "Content-Type": "application/octet-stream" },
      body: arquivo,
    });
  } catch {
    throw new ErroApi(0, "Não foi possível falar com a API. Confira se o uvicorn está rodando na porta 8000.");
  }
  if (!resposta.ok) throw new ErroApi(resposta.status, await mensagemDeErro(resposta));
  return (await resposta.json()) as T;
}

export const api = {
  fontes: (sinal?: AbortSignal) => obter<Fonte[]>("/fontes", {}, sinal),
  atualizacoes: (sinal?: AbortSignal) => obter<SituacaoFonte[]>("/fontes/atualizacoes", {}, sinal),
  /** Só administrador. Com `forcar`, aceita uma versão bem menor que a ativa. */
  enviarFonte: (grupo: string, arquivo: File, forcar = false) =>
    enviarArquivo<ResultadoEnvio>(
      `/fontes/${encodeURIComponent(grupo)}/arquivo`,
      { nome: arquivo.name, ...(forcar ? { forcar: "true" } : {}) },
      arquivo,
    ),
  buscarMedicamentos: (q: string, sinal?: AbortSignal) => obter<Registro[]>("/medicamentos", { q, limite: 10 }, sinal),
  obterMedicamento: (
    registro: string,
    filtros: { uf?: string; cid?: string; alc?: boolean },
    sinal?: AbortSignal,
  ) =>
    obter<Medicamento>(
      `/medicamentos/${encodeURIComponent(registro)}`,
      { uf: filtros.uf, cid: filtros.cid, alc: filtros.alc || undefined },
      sinal,
    ),
  estoqueSus: (registro: string, uf: string, sinal?: AbortSignal) =>
    obter<EstoqueSus>(`/medicamentos/${encodeURIComponent(registro)}/estoque-sus`, { uf }, sinal),
  buscarCids: (q: string, sinal?: AbortSignal) => obter<Cid[]>("/cids", { q, limite: 20 }, sinal),
  obterCid: (codigo: string, sinal?: AbortSignal) =>
    obter<CidDetalhe>(`/cids/${encodeURIComponent(codigo)}`, { limite_registros: 10 }, sinal),

  // Conta
  sessao: (sinal?: AbortSignal) => obter<Conta | null>("/auth/sessao", {}, sinal),
  cadastrar: (dados: Cadastro) => enviar<Conta>("POST", "/auth/cadastro", dados),
  entrar: (email: string, senha: string) => enviar<Conta>("POST", "/auth/entrar", { email, senha }),
  sair: () => enviar<void>("POST", "/auth/sair"),
  alterarConta: (nome: string) => enviar<Conta>("PATCH", "/conta", { nome }),
  trocarSenha: (senha_atual: string, nova_senha: string) => enviar<void>("PUT", "/conta/senha", { senha_atual, nova_senha }),
  consentimentoSaude: (aceito: boolean) => enviar<Conta>("PUT", "/conta/consentimento-saude", { aceito }),
  excluirConta: (senha: string) => enviar<void>("DELETE", "/conta", { senha }),
  enderecoExportacao: `${BASE}/conta/exportar`,
  // Perfis de paciente
  perfis: (sinal?: AbortSignal) => obter<Perfil[]>("/perfis", {}, sinal),
  perfil: (id: number, sinal?: AbortSignal) => obter<Perfil>(`/perfis/${id}`, {}, sinal),
  criarPerfil: (dados: DadosDoPerfil) => enviar<Perfil>("POST", "/perfis", dados),
  alterarPerfil: (id: number, dados: Partial<DadosDoPerfil>) => enviar<Perfil>("PATCH", `/perfis/${id}`, dados),
  excluirPerfil: (id: number) => enviar<void>("DELETE", `/perfis/${id}`),
  adicionarDoenca: (id: number, codigo_cid: string) => enviar<Perfil>("POST", `/perfis/${id}/doencas`, { codigo_cid }),
  removerDoenca: (id: number, doenca: number) => enviar<Perfil>("DELETE", `/perfis/${id}/doencas/${doenca}`),
  adicionarMedicamento: (id: number, dados: { numero_registro?: string; nome?: string; codigo_cid?: string }) =>
    enviar<Perfil>("POST", `/perfis/${id}/medicamentos`, dados),
  removerMedicamento: (id: number, medicamento: number) => enviar<Perfil>("DELETE", `/perfis/${id}/medicamentos/${medicamento}`),
};
