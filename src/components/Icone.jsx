// Ícones simples desenhados em linha (herdam a cor do texto).
const P = {
  inicio: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>,
  mais: <><path d="M12 5v14M5 12h14" /></>,
  catalogo: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  resumo: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  cobrar: <><circle cx="12" cy="12" r="9" /><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.6-.6-3-1.6M12 6v2M12 16v2" /></>,
  pessoa: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" /></>,
  cadeado: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>,
  olho: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  recibo: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  orcamento: <><path d="M14 3H6v18h12V7z" /><path d="M14 3v4h4M9 13h6M9 17h4" /></>,
  estrela: <><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></>,
  lixo: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" /></>,
  voltar: <><path d="M15 6l-6 6 6 6" /></>,
  avancar: <><path d="M9 6l6 6-6 6" /></>,
  check: <><path d="M5 12l5 5 9-10" /></>,
}

export default function Icone({ nome, tamanho = 22, className = '' }) {
  return (
    <svg className={`icone ${className}`} width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[nome]}
    </svg>
  )
}
