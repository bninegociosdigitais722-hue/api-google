"use client"

import { useMemo, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  Download,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Send,
  X,
} from 'lucide-react'

import EmptyState from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Resultado = {
  id: string
  nome: string
  endereco: string
  telefone: string | null
  nota: number | null
  mapsUrl: string
  fotoUrl: string | null
  temWhatsapp?: boolean
  lastOutboundTemplate?: string | null
}

type ApiResponse = {
  resultados: Resultado[]
  message?: string
}

const sugestoes = ['supermercado', 'açougue', 'padaria', 'hortifruti', 'mercearia']

const searchSchema = z.object({
  tipo: z.string().min(2, 'Informe o tipo de estabelecimento.'),
  localizacao: z.string().min(2, 'Informe a localização.'),
  somenteWhatsapp: z.boolean().optional(),
})

type SearchForm = z.infer<typeof searchSchema>

type Props = {
  initialResults?: Resultado[]
  total?: number | null
  error?: string | null
  sentMap?: Record<string, { template: string | null; lastOutboundAt: string | null }>
  apiPrefix?: string
}

export default function ConsultasClient({
  initialResults = [],
  total = null,
  error: initialError = null,
  sentMap = {},
  apiPrefix = '/api/admin',
}: Props) {
  const [resultados, setResultados] = useState<Resultado[]>(initialResults)
  const [visiveis, setVisiveis] = useState<Resultado[]>(initialResults.slice(0, 18))
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(initialError)
  const [totalCount, setTotalCount] = useState<number | null>(total)
  const [sendingPhone, setSendingPhone] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SearchForm>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      tipo: 'supermercado',
      localizacao: '',
      somenteWhatsapp: false,
    },
  })

  const tipoAtual = watch('tipo')
  const countRestantes = useMemo(() => resultados.length - visiveis.length, [resultados, visiveis])

  const normalizePhone = (phone?: string | null) => {
    if (!phone) return null
    const digits = phone.replace(/\D/g, '')
    if (!digits) return null
    if (digits.length === 10 || digits.length === 11) return `55${digits}`
    if (digits.startsWith('55')) return digits
    return digits
  }

  const isSent = (phone?: string | null) => {
    const norm = normalizePhone(phone)
    if (!norm) return false
    if (sentMap[norm]) return true
    return Boolean(
      resultados.find((r) => normalizePhone(r.telefone) === norm)?.lastOutboundTemplate
    )
  }

  const onSubmit = async (values: SearchForm) => {
    setErro(null)
    setLoading(true)
    setResultados([])
    setVisiveis([])

    try {
      const query = new URLSearchParams({ tipo: values.tipo, localizacao: values.localizacao })
      if (values.somenteWhatsapp) {
        query.set('onlyWhatsapp', 'true')
      }
      const response = await fetch(`${apiPrefix}/busca?${query.toString()}`)
      const data: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Não foi possível completar a busca.')
      }

      const enriched = data.resultados.map((r) => ({
        ...r,
        lastOutboundTemplate: isSent(r.telefone) ? 'supercotacao_demo' : null,
      }))
      setResultados(enriched)
      setVisiveis(enriched.slice(0, 18))
      setTotalCount(enriched.length)
      toast.success('Busca concluída com sucesso.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado ao buscar.'
      setErro(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const renderEmptyState = () => (
    <EmptyState
      icon={Search}
      title="Comece sua busca"
      description="Digite o tipo de comércio e uma localização para encontrar estabelecimentos com contato direto no WhatsApp."
      action={
        <>
          <Badge variant="secondary">Ex.: açougue em Curitiba</Badge>
          <Badge variant="secondary">Ex.: supermercado 01001-000</Badge>
        </>
      }
    />
  )

  return (
    <section className="space-y-6">
        <Card className="border border-border/60 bg-card/80 shadow-card">
          <CardContent className="space-y-6 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Filtros</p>
                <h3 className="text-lg font-semibold text-foreground">Nova consulta</h3>
                <p className="text-sm text-muted-foreground">
                  Combine tipo de estabelecimento e localização para sugerir novos contatos.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sugestoes.map((item) => (
                  <Button
                    key={item}
                    type="button"
                    variant={tipoAtual === item ? 'default' : 'soft'}
                    size="sm"
                    onClick={() => setValue('tipo', item, { shouldDirty: true, shouldValidate: true })}
                  >
                    {item}
                  </Button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-2">
                <label className="flex min-h-[24px] items-center text-sm font-semibold text-foreground">
                  Tipo de estabelecimento
                </label>
                <Input
                  placeholder="açougue, supermercado, padaria"
                  {...register('tipo')}
                  aria-invalid={Boolean(errors.tipo)}
                />
                {errors.tipo && <p className="text-xs text-red-600">{errors.tipo.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="flex min-h-[24px] items-center justify-between text-sm font-semibold text-foreground">
                  <span>Localização</span>
                  <span className="text-xs font-normal text-muted-foreground">bairro, cidade ou CEP</span>
                </label>
                <Input
                  placeholder="Ex.: Pinheiros, São Paulo ou 01310-930"
                  {...register('localizacao')}
                  aria-invalid={Boolean(errors.localizacao)}
                />
                {errors.localizacao && (
                  <p className="text-xs text-red-600">{errors.localizacao.message}</p>
                )}
              </div>
              <div className="flex items-end">
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {loading ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  {...register('somenteWhatsapp')}
                />
                Somente com WhatsApp
              </label>
              <span className="text-xs">
                Filtra apenas estabelecimentos cujo telefone está ativo no WhatsApp via Z-API.
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Painel</p>
            <h2 className="text-2xl font-semibold text-foreground">Resultados</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {resultados.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
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
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            )}
            {totalCount !== null && (
              <Badge variant="secondary">{totalCount} resultados</Badge>
            )}
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
              <span>Buscando estabelecimentos...</span>
            </div>
          )}
        </div>

        {erro && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {!loading && resultados.length === 0 && renderEmptyState()}

        {visiveis.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {visiveis.map((item) => (
                <Card
                  key={item.id}
                  className="group relative flex h-full flex-col border border-border/60 bg-card/80 shadow-card transition hover:-translate-y-1 hover:shadow-elevated"
                >
                  <CardContent className="space-y-4 p-3">
                    <div className="relative overflow-hidden rounded-2xl bg-muted/40 ring-1 ring-border/60">
                      {isSent(item.telefone) && (
                        <span className="absolute left-3 top-3 z-10">
                          <Badge variant="success">Enviado</Badge>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const novosVisiveis = visiveis.filter((v) => v.id !== item.id)
                          const novosResultados = resultados.filter((v) => v.id !== item.id)
                          setResultados(novosResultados)
                          setVisiveis(novosVisiveis)
                        }}
                        className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-foreground shadow-lg transition hover:bg-white"
                        title="Remover este estabelecimento (não entra no CSV)"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {item.fotoUrl ? (
                        <img
                          src={item.fotoUrl}
                          alt={item.nome}
                          className="h-[170px] w-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-[170px] items-center justify-center text-xs text-muted-foreground">
                          Sem foto
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-foreground line-clamp-2">
                            {item.nome}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.endereco}
                          </p>
                        </div>
                        {item.nota && (
                          <Badge variant="secondary">
                            <span aria-hidden>★</span>
                            <span>{item.nota.toFixed(1)}</span>
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-2.5 py-1">
                          <Phone className="h-3 w-3 text-primary" />
                          <span className="line-clamp-1">
                            {item.telefone ?? 'Telefone não informado'}
                          </span>
                        </span>
                        {item.temWhatsapp && <Badge variant="success">WhatsApp</Badge>}
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
                        <span className="line-clamp-1">Abra no Google Maps para rotas e avaliações</span>
                        <a
                          className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-primary ring-1 ring-border/70 transition hover:bg-muted/40"
                          href={item.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MapPin className="h-3 w-3" />
                          Ver no Maps
                        </a>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-wrap items-center gap-2 px-3 pb-4 pt-0">
                    <Button
                      type="button"
                      size="sm"
                      variant={isSent(item.telefone) ? 'soft' : 'outline'}
                      disabled={!item.telefone || isSent(item.telefone) || sendingPhone === item.telefone}
                      onClick={async () => {
                        if (!item.telefone) return
                        setSendingPhone(item.telefone)
                        try {
                          const resp = await fetch(`${apiPrefix}/atendimento/send`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              phones: [item.telefone],
                              name: item.nome,
                              template: 'supercotacao_demo',
                              photoUrl: item.fotoUrl ?? null,
                            }),
                          })
                          const data = await resp.json()
                          if (!resp.ok) {
                            throw new Error(data.message || 'Falha ao enviar')
                          }
                          const normalized = normalizePhone(item.telefone)
                          const result = Array.isArray(data?.results)
                            ? data.results.find((r: any) => normalizePhone(r.phone) === normalized)
                            : null
                          if (result?.status === 'failed') {
                            throw new Error(result.error || 'Falha ao enviar')
                          }
                          if (result?.status === 'skipped') {
                            toast.message('Convite já enviado anteriormente.')
                            return
                          }
                          setResultados((prev) =>
                            prev.map((r) =>
                              r.id === item.id ? { ...r, lastOutboundTemplate: 'supercotacao_demo' } : r
                            )
                          )
                          setVisiveis((prev) =>
                            prev.map((r) =>
                              r.id === item.id ? { ...r, lastOutboundTemplate: 'supercotacao_demo' } : r
                            )
                          )
                          toast.success('Convite enviado com sucesso.')
                        } catch (err) {
                          const message = (err as Error)?.message || 'Erro ao disparar'
                          setErro(message)
                          toast.error(message)
                        } finally {
                          setSendingPhone(null)
                        }
                      }}
                      className="flex-1"
                    >
                      <Send className="h-4 w-4" />
                      {isSent(item.telefone)
                        ? 'Enviado'
                        : sendingPhone === item.telefone
                          ? 'Enviando...'
                          : 'Disparar convite'}
                    </Button>

                    {isSent(item.telefone) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={sendingPhone === item.telefone}
                        onClick={async () => {
                          if (!item.telefone) return
                          setSendingPhone(item.telefone)
                        try {
                          const resp = await fetch(`${apiPrefix}/atendimento/send`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              phones: [item.telefone],
                              name: item.nome,
                              template: 'supercotacao_demo',
                              force: true,
                              photoUrl: item.fotoUrl ?? null,
                            }),
                          })
                          const data = await resp.json()
                          if (!resp.ok) throw new Error(data.message || 'Falha ao reenviar')
                          const normalized = normalizePhone(item.telefone)
                          const result = Array.isArray(data?.results)
                            ? data.results.find((r: any) => normalizePhone(r.phone) === normalized)
                            : null
                          if (result?.status === 'failed') {
                            throw new Error(result.error || 'Falha ao reenviar')
                          }
                          setResultados((prev) =>
                            prev.map((r) =>
                              r.id === item.id ? { ...r, lastOutboundTemplate: 'supercotacao_demo' } : r
                              )
                            )
                            setVisiveis((prev) =>
                              prev.map((r) =>
                                r.id === item.id ? { ...r, lastOutboundTemplate: 'supercotacao_demo' } : r
                              )
                            )
                            toast.success('Convite reenviado.')
                          } catch (err) {
                            const message = (err as Error)?.message || 'Erro ao reenviar'
                            setErro(message)
                            toast.error(message)
                          } finally {
                            setSendingPhone(null)
                          }
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                        {sendingPhone === item.telefone ? 'Reenviando...' : 'Reenviar'}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
            {visiveis.length < resultados.length && (
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const proximo = Math.min(visiveis.length + 12, resultados.length)
                    setVisiveis(resultados.slice(0, proximo))
                  }}
                >
                  Mostrar mais ({countRestantes} restantes)
                </Button>
              </div>
            )}
          </>
        )}
    </section>
  )
}
