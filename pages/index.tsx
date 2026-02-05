import Head from 'next/head'
import { FormEvent, useState } from 'react'
import SidebarLayout from '../components/SidebarLayout'

type Resultado = {
  id: string
  nome: string
  endereco: string
  telefone: string | null
  nota: number | null
  mapsUrl: string
  fotoUrl: string | null
  temWhatsapp?: boolean
}

type ApiResponse = {
  resultados: Resultado[]
  message?: string
}

const sugestoes = ['supermercado', 'açougue', 'padaria', 'hortifruti', 'mercearia']

export default function HomePage() {
  const [tipo, setTipo] = useState('supermercado')
  const [localizacao, setLocalizacao] = useState('')
  const [somenteWhatsapp, setSomenteWhatsapp] = useState(false)
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [visiveis, setVisiveis] = useState<Resultado[]>([])
  const [removidos, setRemovidos] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!tipo.trim() || !localizacao.trim()) {
      setErro('Preencha o tipo de estabelecimento e a localização para buscar.')
      return
    }

    setErro(null)
    setLoading(true)
    setResultados([])
    setVisiveis([])
    setRemovidos(new Set())

    try {
      const query = new URLSearchParams({ tipo, localizacao })
      if (somenteWhatsapp) {
        query.set('onlyWhatsapp', 'true')
      }
      const response = await fetch(`/api/busca?${query.toString()}`)
      const data: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Não foi possível completar a busca.')
      }

      setResultados(data.resultados)
      setVisiveis(data.resultados.slice(0, 18))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado ao buscar.'
      setErro(message)
    } finally {
      setLoading(false)
    }
  }

  const renderEstadoVazio = () => (
    <div className="glass-panel rounded-2xl p-8 text-center shadow-glow">
      <p className="text-lg text-slate-200">
        Digite um tipo de comércio e uma localização para encontrar as melhores opções perto de você.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm text-slate-300">
        <span className="rounded-full bg-white/5 px-3 py-1">Ex.: açougue em Curitiba</span>
        <span className="rounded-full bg-white/5 px-3 py-1">Ex.: supermercado 01001-000</span>
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-surface text-slate-50">
      <Head>
        <title>Radar Local | Descubra, filtre por WhatsApp e fale agora</title>
        <meta
          name="description"
          content="Encontre comércios perto de você, veja telefone, nota, e chame direto no WhatsApp."
        />
      </Head>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute inset-0 bg-radial-dots" />
      </div>
      <SidebarLayout
        title="Consultas"
        description="Busque comércios, filtre apenas quem tem WhatsApp ativo e abra rotas no Maps."
      >
        <section className="space-y-5">
          <form
            onSubmit={handleSubmit}
            className="glass-panel grid gap-3 rounded-3xl border border-white/5 p-5 shadow-xl sm:p-6 lg:grid-cols-[1.1fr_1.1fr_auto]"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span className="font-semibold text-slate-200">Tipo de estabelecimento</span>
                <div className="flex flex-wrap gap-2">
                  {sugestoes.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTipo(item)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        tipo === item
                          ? 'bg-brand/20 text-brand ring-1 ring-brand/40'
                          : 'bg-white/5 text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <input
                className="input-field h-[52px] text-base"
                placeholder="açougue, supermercado, padaria"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                name="tipo"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between text-sm text-slate-300" htmlFor="localizacao">
                <span className="font-semibold text-slate-200">Localização</span>
                <span className="text-xs text-slate-400">bairro, cidade ou CEP</span>
              </label>
              <input
                id="localizacao"
                className="input-field h-[52px] text-base"
                placeholder="Ex.: Pinheiros, São Paulo ou 01310-930"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                name="localizacao"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="btn-primary w-full text-base font-semibold shadow-glow"
                disabled={loading}
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer rounded border-white/30 bg-white/10 text-brand focus:ring-brand"
                checked={somenteWhatsapp}
                onChange={(e) => setSomenteWhatsapp(e.target.checked)}
              />
              Somente com WhatsApp
            </label>
            <span className="text-xs text-slate-400">Filtra apenas os estabelecimentos cujo telefone está ativo no WhatsApp via Z-API.</span>
          </div>

          {erro && (
            <div className="glass-panel flex items-center gap-3 rounded-xl border border-red-500/30 px-4 py-3 text-red-100">
              <span className="text-lg">⚠️</span>
              <p className="text-sm sm:text-base">{erro}</p>
            </div>
          )}
        </section>

        <section className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Painel</p>
              <h2 className="text-2xl font-semibold text-slate-50">Resultados</h2>
            </div>
            {resultados.length > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/20"
                onClick={() => {
                  const header = ['nome', 'endereco', 'telefone']
                  const rows = resultados.map((r) => [
                    r.nome.replace(/"/g, '""'),
                    r.endereco.replace(/"/g, '""'),
                    (r.telefone ?? '').replace(/"/g, '""'),
                  ])
                  const csv =
                    [header, ...rows]
                      .map((cols) => cols.map((c) => `"${c}"`).join(','))
                      .join('\n') + '\n'
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'super-cotacao.csv'
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                📤 Exportar CSV (nome, endereço, telefone)
              </button>
            )}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="h-2 w-2 animate-ping rounded-full bg-brand" />
                <span>Buscando estabelecimentos...</span>
              </div>
            )}
          </div>

          {!loading && resultados.length === 0 && renderEstadoVazio()}

          {visiveis.length > 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
                {visiveis.map((item) => (
                  <article
                    key={item.id}
                    className="glass-panel group relative flex h-full flex-col rounded-3xl border border-white/5 p-3 shadow-xl transition hover:-translate-y-1 hover:shadow-glow"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const newSet = new Set(removidos)
                        newSet.add(item.id)
                        setRemovidos(newSet)
                        const novosVisiveis = visiveis.filter((v) => v.id !== item.id)
                        const novosResultados = resultados.filter((v) => v.id !== item.id)
                        setResultados(novosResultados)
                        setVisiveis(novosVisiveis)
                      }}
                      className="absolute right-2 top-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-600/90 text-sm font-bold text-white shadow-lg shadow-red-900/50 transition hover:scale-105"
                      title="Remover este estabelecimento (não entra no CSV)"
                    >
                      ✕
                    </button>
                    <div className="overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/5">
                      {item.fotoUrl ? (
                        <img
                          src={item.fotoUrl}
                          alt={item.nome}
                          className="h-[180px] w-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                      <div className="flex h-[180px] items-center justify-center text-xs text-slate-400">
                        Sem foto
                      </div>
                      )}
                    </div>
                    <div className="mt-3 flex h-full flex-col justify-between gap-2">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                              {item.nome}
                            </h3>
                            <p className="text-xs text-slate-300 leading-snug line-clamp-2">
                              {item.endereco}
                            </p>
                          </div>
                          {item.nota && (
                            <span className="flex items-center gap-1 rounded-full bg-brand/15 px-2 py-1 text-xs font-semibold text-brand">
                              <span aria-hidden>★</span>
                              <span>{item.nota.toFixed(1)}</span>
                            </span>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-200">
                          <span className="text-brand">☎</span>
                          <span className="line-clamp-1">{item.telefone ?? 'Telefone não informado'}</span>
                          {item.temWhatsapp && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                              <span className="text-emerald-100">WhatsApp</span>
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[12px] text-slate-300">
                        <span className="line-clamp-1">Abra no Google Maps para rotas e avaliações</span>
                        <a
                          className="rounded-full bg-white/10 px-3 py-1.5 text-brand transition hover:bg-white/20 whitespace-nowrap"
                          href={item.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver no Maps →
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {visiveis.length < resultados.length && (
                <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        className="btn-primary px-5 py-3 text-sm"
                        onClick={() => {
                          const proximo = Math.min(visiveis.length + 12, resultados.length)
                          setVisiveis(resultados.slice(0, proximo))
                        }}
                      >
                        Mostrar mais ({resultados.length - visiveis.length} restantes)
                      </button>
                </div>
              )}
            </>
          )}
        </section>
      </SidebarLayout>
    </div>
  )
}
