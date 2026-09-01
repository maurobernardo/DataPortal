'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Anima um número de 0 até `value` quando entra em vista, uma única vez. Usado nos KPIs do portal
 * (hero, secção Sobre) para dar peso à leitura de um número sem a exagerar: só a chegada ao valor
 * é suave, o valor em si nunca é adivinhado nem inventado, vem sempre de `value`.
 *
 * Respeita prefers-reduced-motion: salta directamente para o valor final, sem contagem.
 */
export function CountUp({
  value,
  durationMs = 900,
  formatar = (n: number) => Math.round(n).toLocaleString('pt-PT'),
  className,
}: {
  value: number
  durationMs?: number
  formatar?: (n: number) => string
  className?: string
}) {
  const [exibido, setExibido] = useState(0)
  const ref = useRef<HTMLSpanElement | null>(null)
  const jaAnimouRef = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduzMovimento) {
      setExibido(value)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || jaAnimouRef.current) return
        jaAnimouRef.current = true
        observer.disconnect()

        const inicio = performance.now()
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

        function passo(agora: number) {
          const decorrido = agora - inicio
          const t = Math.min(1, decorrido / durationMs)
          setExibido(value * easeOutCubic(t))
          if (t < 1) requestAnimationFrame(passo)
        }
        requestAnimationFrame(passo)
      },
      { threshold: 0.4 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [value, durationMs])

  return (
    <span ref={ref} className={`pd-countup ${className || ''}`.trim()}>
      {formatar(exibido)}
    </span>
  )
}
