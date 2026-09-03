import Link from 'next/link'
import { Video, Send } from 'lucide-react'
import { VisorRuas360 } from '@/components/mapillary/VisorRuas360'
import '../ruas-360.css'

export const metadata = {
  title: 'Ruas 360° | Data Portal',
  description:
    'Navegue pelas ruas de Maputo e Chimoio captadas em 360° pela equipa do Data Portal, rua a rua, com sinais de trânsito e filtros, sem sair do portal.',
}

const PASSOS = [
  {
    titulo: 'Comece por escolher a cidade',
    texto:
      'Maputo ou Chimoio, ali no canto superior direito do visor. O mapa salta logo para lá, já numa rua dessa cidade.',
  },
  {
    titulo: 'Depois é só clicar num ponto verde',
    texto:
      'Cada ponto verde é uma rua já captada. Clique num deles e está lá, a ver exactamente o que quem gravou viu.',
  },
  {
    titulo: 'E andar pela rua à vontade',
    texto:
      'Arraste a imagem para olhar em qualquer direcção. As setas no topo avançam imagem a imagem, ou deixe o botão de reprodução percorrer a rua sozinho.',
  },
  {
    titulo: 'O mapa mostra sempre onde está',
    texto:
      'O círculo azul é a sua posição, e o cone mostra para onde a câmara está virada. Os dois acompanham cada passo que dá pela rua.',
  },
  {
    titulo: 'Quer ver os sinais de trânsito?',
    texto:
      'Ligue "Sinais de trânsito" e eles aparecem no mapa: stop, cedência, limites de velocidade, passadeiras. Aproxime para os ver melhor, e clique num para ir direito a essa rua.',
  },
  {
    titulo: 'Mapa e rua trocam de lugar quando quiser',
    texto:
      'Clique no painel pequeno para o pôr em grande, ou use o botão "Mapa em grande". E entre "Mapa" e "Satélite" escolhe o fundo que preferir.',
  },
  {
    titulo: 'Se quiser, também pode filtrar',
    texto:
      'Só imagens 360°, só normais, um período de datas, ou quem captou: tudo em "Filtros", com um contador a mostrar quantos estão activos.',
  },
  {
    titulo: 'E voltar a uma captura antiga',
    texto:
      'Em "Capturas" estão todos os percursos já gravados naquela zona, cada um com data, foto e número de imagens. Escolha um e o mapa mostra só esse.',
  },
]

export default function Ruas360Page() {
  return (
    <div className="ruas360-page">
      <section className="ruas360-hero pd-photo-hero">
        <div className="pd-photo-hero-bg" style={{ backgroundImage: "url('/images/fundo15.webp')" }} aria-hidden />
        <div className="pd-photo-hero-scrim" aria-hidden />
        <div className="ruas360-inner">
          <div className="ruas360-eyebrow">
            <Video className="size-3.5" aria-hidden />
            Captado pela nossa equipa
          </div>
          <h1>
            As ruas de Maputo e Chimoio, <span className="accent">em 360°.</span>
          </h1>
          <p className="ruas360-hero-lede">
            A nossa equipa percorreu e gravou estas ruas em 360°. Aqui pode andar por elas imagem a
            imagem, olhar para qualquer lado, ver os sinais de trânsito detectados e voltar a
            qualquer captura feita ao longo dos anos, tudo dentro do portal.
          </p>
          <div className="ruas360-hero-destaques">
            <span>Maputo e Chimoio</span>
            <span>Imagens 360°</span>
            <span>Sinais de trânsito</span>
            <span>Mapa e satélite</span>
          </div>
          <Link
            href="/servicos?assunto=Levantamento%20Ruas%20360%C2%B0#consultoria"
            className="ruas360-hero-cta"
          >
            <Send className="size-4" aria-hidden />
            Solicitar este serviço para a sua cidade
          </Link>
        </div>
      </section>

      <div className="ruas360-main">
        <VisorRuas360 />
      </div>

      <Link
        href="/servicos?assunto=Levantamento%20Ruas%20360%C2%B0#consultoria"
        className="ruas360-flutuante"
        aria-label="Solicitar o serviço de Ruas 360° para a sua zona"
      >
        <Send className="size-4" aria-hidden />
        <span>Solicitar este serviço</span>
      </Link>

      <section className="ruas360-guia">
        <div className="ruas360-inner">
          <h2>Como usar o visor</h2>
          <p className="ruas360-guia-lede">
            Não precisa de conta para nada disto: é só abrir o visor e seguir estes passos.
          </p>
          <ol className="ruas360-passos">
            {PASSOS.map((passo, indice) => (
              <li key={passo.titulo} className="ruas360-passo">
                <span className="ruas360-passo-numero">{indice + 1}</span>
                <div className="ruas360-passo-corpo">
                  <h3>{passo.titulo}</h3>
                  <p>{passo.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  )
}
