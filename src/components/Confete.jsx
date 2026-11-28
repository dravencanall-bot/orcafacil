// Chuva de confete rápida (quando um orçamento é marcado como pago, por exemplo).
import { useEffect, useState } from 'react'

const CORES = ['#f97316', '#fbbf24', '#0f766e', '#16a34a', '#ec4899', '#3b82f6']
const pecas = Array.from({ length: 40 }, (_, i) => ({
  left: (i * 37) % 100, cor: CORES[i % CORES.length], atraso: (i % 8) * 0.08, duracao: 1.4 + (i % 5) * 0.25, giro: i % 2 ? 1 : -1,
}))

let disparar = () => {}
export const soltarConfete = () => disparar()

export default function Confete() {
  const [vez, setVez] = useState(0)
  useEffect(() => { disparar = () => setVez((v) => v + 1) }, [])
  useEffect(() => {
    if (!vez) return
    const t = setTimeout(() => setVez(0), 2600)
    return () => clearTimeout(t)
  }, [vez])
  if (!vez) return null
  return (
    <div className="confete-tela festa-confete" key={vez} aria-hidden="true">
      {pecas.map((c, i) => (
        <i key={i} style={{ left: `${c.left}%`, background: c.cor, animationDelay: `${c.atraso}s`, animationDuration: `${c.duracao}s`, '--giro': c.giro }} />
      ))}
    </div>
  )
}
