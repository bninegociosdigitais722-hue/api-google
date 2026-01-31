import type { NextApiRequest, NextApiResponse } from 'next'

type PlaceSummary = {
  id: string
  nome: string
  endereco: string
  telefone: string | null
  nota: number | null
  mapsUrl: string
  fotoUrl: string | null
}

type ErrorResponse = { message: string }

type SuccessResponse = { resultados: PlaceSummary[] }

const normalizeType = (value: string): string | undefined => {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z_]/g, '')
    .slice(0, 60)

  return normalized || undefined
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  const requestId = Math.random().toString(16).slice(2, 10)
  const log = (message: string, extra?: Record<string, any>) => {
    console.log(
      JSON.stringify({
        tag: 'api/busca',
        requestId,
        message,
        ...extra,
      })
    )
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ message: 'Método não permitido.' })
  }

  const { tipo, localizacao } = req.query

  if (!tipo || !localizacao || Array.isArray(tipo) || Array.isArray(localizacao)) {
    return res
      .status(400)
      .json({ message: 'Parâmetros "tipo" e "localizacao" são obrigatórios.' })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return res
      .status(500)
      .json({ message: 'Variável de ambiente GOOGLE_MAPS_API_KEY não configurada.' })
  }

  const tipoText = tipo.trim()
  const localizacaoText = localizacao.trim()

  const fetchCoords = async (): Promise<{ lat: number; lng: number } | null> => {
    // 1) Tenta Geocoding (preferencial)
    try {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        localizacaoText
      )}&language=pt-BR&region=br&components=country:BR&key=${apiKey}`

      const geocodeResponse = await fetch(geocodeUrl)
      const geocodeJson = await geocodeResponse.json()

      log('geocode_response', {
        status: geocodeJson.status,
        results: geocodeJson.results?.length ?? 0,
        firstResult: geocodeJson.results?.[0]?.formatted_address,
        errorMessage: geocodeJson.error_message,
      })

      if (geocodeJson.status === 'REQUEST_DENIED') {
        throw new Error(
          geocodeJson.error_message || 'REQUEST_DENIED na Geocoding API (ver restrições da chave).'
        )
      }

      if (geocodeJson.status === 'OK' && geocodeJson.results?.length) {
        return geocodeJson.results[0].geometry.location
      }
    } catch (err) {
      log('geocode_error', { error: (err as Error)?.message })
    }

    // 2) Fallback: Places Text Search para obter um ponto central
    try {
      const textUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
      textUrl.searchParams.set('query', localizacaoText)
      textUrl.searchParams.set('language', 'pt-BR')
      textUrl.searchParams.set('region', 'br')
      textUrl.searchParams.set('key', apiKey)

      const textResponse = await fetch(textUrl.toString())
      const textJson = await textResponse.json()

      log('textsearch_response', {
        status: textJson.status,
        results: textJson.results?.length ?? 0,
        firstResult: textJson.results?.[0]?.formatted_address,
        errorMessage: textJson.error_message,
      })

      if (textJson.status === 'REQUEST_DENIED') {
        throw new Error(
          textJson.error_message || 'REQUEST_DENIED na Places Text Search (ver restrições da chave).'
        )
      }

      if (textJson.status === 'OK' && Array.isArray(textJson.results) && textJson.results.length) {
        const loc = textJson.results[0].geometry?.location
        if (loc?.lat && loc?.lng) {
          return loc
        }
      }
    } catch (err) {
      log('textsearch_error', { error: (err as Error)?.message })
    }

    return null
  }

  const coords = await fetchCoords()
  if (!coords) {
    log('coords_not_found', { localizacao: localizacaoText })
    return res.status(404).json({
      message:
        'Localização não encontrada. Tente incluir bairro + cidade/UF (ex.: "Recreio dos Bandeirantes, Rio de Janeiro").',
    })
  }

  try {
    log('coords_found', { lat: coords.lat, lng: coords.lng })

    const nearbyUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
    nearbyUrl.searchParams.set('location', `${coords.lat},${coords.lng}`)
    nearbyUrl.searchParams.set('radius', '3000')
    const normalizedType = normalizeType(tipoText)
    if (normalizedType) {
      nearbyUrl.searchParams.set('type', normalizedType)
    }
    nearbyUrl.searchParams.set('keyword', tipoText)
    nearbyUrl.searchParams.set('language', 'pt-BR')
    nearbyUrl.searchParams.set('key', apiKey)

    // Função para coletar múltiplas páginas (até ~60 resultados) usando next_page_token
    const fetchNearbyPages = async (url: URL, maxResults = 60) => {
      const collected: any[] = []
      let pageUrl: URL | null = new URL(url.toString())

      while (pageUrl && collected.length < maxResults) {
        const resp = await fetch(pageUrl.toString())
        const json = await resp.json()

        log('nearby_response', {
          status: json.status,
          results: json.results?.length ?? 0,
          firstResult: json.results?.[0]?.name,
          errorMessage: json.error_message,
          pageTokenPresent: Boolean(json.next_page_token),
        })

        if (json.status === 'REQUEST_DENIED') {
          return { error: json.error_message }
        }

        if (Array.isArray(json.results)) {
          collected.push(...json.results)
        }

        if (json.next_page_token && collected.length < maxResults) {
          // A Google exige um pequeno atraso antes de usar o next_page_token
          await new Promise((r) => setTimeout(r, 1500))
          pageUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
          pageUrl.searchParams.set('pagetoken', json.next_page_token)
          pageUrl.searchParams.set('key', apiKey)
        } else {
          pageUrl = null
        }
      }

      return { results: collected.slice(0, maxResults) }
    }

    const nearbyData = await fetchNearbyPages(nearbyUrl, 30)

    if ('error' in nearbyData) {
      return res.status(502).json({
        message:
          nearbyData.error ||
          'Google retornou REQUEST_DENIED na Places Nearby. Verifique as restrições da chave (IP/domínio) e se as APIs estão liberadas.',
      })
    }

    if (!nearbyData.results || nearbyData.results.length === 0) {
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=120')
      return res.status(200).json({ resultados: [] })
    }

    const limitedResults = nearbyData.results.slice(0, 30)

    const detailed = await Promise.all(
      limitedResults.map(async (place: any) => {
        const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json')
        detailsUrl.searchParams.set('place_id', place.place_id)
        detailsUrl.searchParams.set('fields', 'name,formatted_address,formatted_phone_number,rating,url')
        detailsUrl.searchParams.set('language', 'pt-BR')
        detailsUrl.searchParams.set('key', apiKey)

        const detailsResponse = await fetch(detailsUrl.toString())
        const detailsJson = await detailsResponse.json()
        const details = detailsJson.result ?? {}

        const rating =
          typeof details.rating === 'number'
            ? details.rating
            : typeof place.rating === 'number'
            ? place.rating
            : null

        const endereco = details.formatted_address ?? place.vicinity ?? 'Endereço não informado'

        const photoRef =
          details.photos?.[0]?.photo_reference ??
          place.photos?.[0]?.photo_reference ??
          null

        return {
          id: place.place_id,
          nome: details.name ?? place.name ?? 'Estabelecimento sem nome',
          endereco,
          telefone: details.formatted_phone_number ?? null,
          nota: rating,
          mapsUrl: details.url ?? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
          fotoUrl: photoRef ? `/api/foto?ref=${encodeURIComponent(photoRef)}&maxwidth=600` : null,
        } as PlaceSummary
      })
    )

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=120')
    return res.status(200).json({ resultados: detailed })
  } catch (error) {
    log('unexpected_error', { error: (error as Error)?.message })
    return res
      .status(500)
      .json({ message: 'Erro ao consultar a Google Maps API. Tente novamente em instantes.' })
  }
}
