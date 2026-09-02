import {
  Video,
  MapPin,
  MousePointerClick,
  PlayCircle,
  TrafficCone,
  ArrowLeftRight,
  SlidersHorizontal,
  Images,
  Navigation,
} from 'lucide-react'
import { VisorRuas360 } from '@/components/mapillary/VisorRuas360'
import '../ruas-360.css'

export const metadata = {
  title: 'Ruas 360° | Data Portal',
  description:
    'Navegue pelas ruas de Maputo e Chimoio captadas em 360° pela equipa do Data Portal, rua a rua, com sinais de trânsito e filtros, sem sair do portal.',
}

const PASSOS = [
  {
    icone: MapPin,
    titulo: 'Escolha a cidade',
    texto:
      'No canto superior direito do visor, os botões "Maputo" e "Chimoio" levam o mapa para a cidade que quer ver. O visor abre logo numa rua dessa cidade.',
  },
  {
    icone: MousePointerClick,
    titulo: 'Clique num ponto verde',
    texto:
      'Cada ponto verde no mapa é uma imagem captada no local. Clique num deles para ver essa rua no visor, tal como quem lá esteve.',
  },
  {
    icone: PlayCircle,
    titulo: 'Ande pela rua',
    texto:
      'Arraste a imagem para olhar em redor, em qualquer direcção. Use as setas no topo do visor para avançar imagem a imagem, ou o botão de reprodução para percorrer a rua sozinho.',
  },
  {
    icone: Navigation,
    titulo: 'Siga a posição no mapa',
    texto:
      'O círculo azul mostra onde está e o cone azul para onde a câmara está virada. O mapa acompanha sempre a sua posição enquanto avança pela rua.',
  },
  {
    icone: TrafficCone,
    titulo: 'Veja os sinais de trânsito',
    texto:
      'O botão "Sinais de trânsito" desenha no mapa os sinais detectados: stop, cedência, limites de velocidade, passadeiras e outros. Aproxime o mapa para eles aparecerem, e clique num sinal para ver a rua onde ele está.',
  },
  {
    icone: ArrowLeftRight,
    titulo: 'Troque mapa e rua',
    texto:
      'Clique no painel pequeno para o pôr em grande, e no outro para voltar atrás. O botão "Mapa em grande" faz o mesmo. Entre "Mapa" e "Satélite" escolhe o fundo do mapa.',
  },
  {
    icone: SlidersHorizontal,
    titulo: 'Filtre o que aparece',
    texto:
      'Em "Filtros" pode ver só imagens 360° ou só normais, limitar a um período pela data da captura, e escolher quem captou. O contador no botão mostra quantos filtros estão activos.',
  },
  {
    icone: Images,
    titulo: 'Escolha uma captura',
    texto:
      'O botão "Capturas" lista os percursos gravados naquela zona, cada um com a fotografia, a data e o número de imagens. Escolher um mostra só esse percurso no mapa.',
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
        </div>
      </section>

      <div className="ruas360-main">
        <VisorRuas360 />
      </div>

      <section className="ruas360-guia">
        <div className="ruas360-inner">
          <h2>Como usar o visor</h2>
          <p className="ruas360-guia-lede">
            Oito passos para tirar tudo o que o visor tem. Nenhum precisa de conta iniciada.
          </p>
          <ol className="ruas360-passos">
            {PASSOS.map((passo, indice) => {
              const Icone = passo.icone
              return (
                <li key={passo.titulo} className="ruas360-passo">
                  <div className="ruas360-passo-topo">
                    <span className="ruas360-passo-numero">{indice + 1}</span>
                    <Icone className="size-5 ruas360-passo-icone" aria-hidden />
                  </div>
                  <h3>{passo.titulo}</h3>
                  <p>{passo.texto}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>
    </div>
  )
}
