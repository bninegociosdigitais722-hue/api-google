import type { NextApiRequest, NextApiResponse } from 'next'

type PlaceSummary = {
  id: string
  nome: string
  endereco: string
  telefone: string | null
  nota: number | null
  mapsUrl: string
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

      if (geocodeJson.status === 'OK' && geocodeJson.results?.length) {
        return geocodeJson.results[0].geometry.location
      }
    } catch (err) {
      console.error('[api/busca] Erro no geocoding primário:', err)
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

      if (textJson.status === 'OK' && Array.isArray(textJson.results) && textJson.results.length) {
        const loc = textJson.results[0].geometry?.location
        if (loc?.lat && loc?.lng) {
          return loc
        }
      }
    } catch (err) {
      console.error('[api/busca] Erro no fallback de text search:', err)
    }

    return null
  }

  const coords = await fetchCoords()
  if (!coords) {
    return res.status(404).json({
      message:
        'Localização não encontrada. Tente incluir bairro + cidade/UF (ex.: "Recreio dos Bandeirantes, Rio de Janeiro").',
    })
  }

  try {
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

    const nearbyResponse = await fetch(nearbyUrl.toString())
    const nearbyJson = await nearbyResponse.json()

    if (!Array.isArray(nearbyJson.results) || nearbyJson.results.length === 0) {
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=120')
      return res.status(200).json({ resultados: [] })
    }

    const limitedResults = nearbyJson.results.slice(0, 10)

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

        return {
          id: place.place_id,
          nome: details.name ?? place.name ?? 'Estabelecimento sem nome',
          endereco,
          telefone: details.formatted_phone_number ?? null,
          nota: rating,
          mapsUrl: details.url ?? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        } as PlaceSummary
      })
    )

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=120')
    return res.status(200).json({ resultados: detailed })
  } catch (error) {
    console.error('[api/busca] Erro inesperado:', error)
    return res
      .status(500)
      .json({ message: 'Erro ao consultar a Google Maps API. Tente novamente em instantes.' })
  }
}
