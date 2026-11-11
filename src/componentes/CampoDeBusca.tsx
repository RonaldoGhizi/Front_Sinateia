import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { ErroApi } from "../api";

interface Props<T> {
  rotulo: string;
  dica: string;
  placeholder?: string;
  minimo: number;
  buscar: (termo: string, sinal: AbortSignal) => Promise<T[]>;
  chave: (item: T) => string;
  texto: (item: T) => string;
  item: (item: T) => ReactNode;
  escolhido: T | null;
  aoEscolher: (item: T | null) => void;
}

/** Campo com sugestões da API enquanto a pessoa digita (combobox). */
export function CampoDeBusca<T>({ rotulo, dica, placeholder, minimo, buscar, chave, texto, item, escolhido, aoEscolher }: Props<T>) {
  const id = useId();
  const [termo, setTermo] = useState(escolhido ? texto(escolhido) : "");
  const [opcoes, setOpcoes] = useState<T[]>([]);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const [aviso, setAviso] = useState<string | null>(null);
  const ultimoEscolhido = useRef(escolhido);

  useEffect(() => {
    if (escolhido !== ultimoEscolhido.current) {
      ultimoEscolhido.current = escolhido;
      setTermo(escolhido ? texto(escolhido) : "");
    }
  }, [escolhido, texto]);

  useEffect(() => {
    const limpo = termo.trim();
    if (!aberto || limpo.length < minimo) {
      setOpcoes([]);
      setAviso(null);
      return;
    }
    const controle = new AbortController();
    const espera = setTimeout(() => {
      buscar(limpo, controle.signal).then(
        (achados) => {
          setOpcoes(achados);
          setAtivo(achados.length ? 0 : -1);
          setAviso(achados.length ? null : "Nada encontrado.");
        },
        (erro) => {
          if (!controle.signal.aborted) setAviso(erro instanceof ErroApi ? erro.message : "Erro na busca.");
        },
      );
    }, 250);
    return () => {
      clearTimeout(espera);
      controle.abort();
    };
  }, [termo, aberto, minimo, buscar]);

  function escolher(opcao: T) {
    ultimoEscolhido.current = opcao;
    aoEscolher(opcao);
    setTermo(texto(opcao));
    setAberto(false);
  }

  function teclas(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAberto(true);
      setAtivo((i) => Math.min(i + 1, opcoes.length - 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setAtivo((i) => Math.max(i - 1, 0));
    } else if (evento.key === "Enter" && aberto && opcoes[ativo]) {
      evento.preventDefault();
      escolher(opcoes[ativo]);
    } else if (evento.key === "Escape") {
      setAberto(false);
    }
  }

  const listaVisivel = aberto && (opcoes.length > 0 || aviso);
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="busca">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id={id}
          role="combobox"
          aria-expanded={Boolean(listaVisivel)}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={aberto && ativo >= 0 ? `${id}-${ativo}` : undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAberto(true);
            if (escolhido) {
              ultimoEscolhido.current = null;
              aoEscolher(null);
            }
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          onKeyDown={teclas}
        />
        {listaVisivel && (
          <ul className="sugestoes" id={`${id}-lista`} role="listbox">
            {opcoes.map((opcao, i) => (
              <li
                key={chave(opcao)}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === ativo}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(opcao)}
                onMouseEnter={() => setAtivo(i)}
              >
                {item(opcao)}
              </li>
            ))}
            {aviso && <li className="sugestoes-aviso">{aviso}</li>}
          </ul>
        )}
      </div>
      <span className="dica">{dica}</span>
    </div>
  );
}
