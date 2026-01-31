import type { NextApiRequest, NextApiResponse } from 'next'

// Proxy de fotos para não expor a API key no cliente.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { ref, maxwidth = '400' } = req.query
  if (!ref || Array.isArray(ref)) {
    return res.status(400).json({ message: 'Parâmetro "ref" é obrigatório.' })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return res.status(500).json({ message: 'GOOGLE_MAPS_API_KEY não configurada.' })
  }

  try {
    const photoUrl = new URL('https://maps.googleapis.com/maps/api/place/photo')
    photoUrl.searchParams.set('photoreference', ref)
    photoUrl.searchParams.set('maxwidth', String(maxwidth))
    photoUrl.searchParams.set('key', apiKey)

    const gRes = await fetch(photoUrl.toString())

    if (!gRes.ok) {
      return res.status(502).json({ message: 'Erro ao buscar foto no Google.' })
    }

    const contentType = gRes.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await gRes.arrayBuffer())

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400') // cache 1 dia
    return res.status(200).send(buffer)
  } catch (error) {
    console.error('[api/foto] erro', error)
    return res.status(500).json({ message: 'Erro interno ao obter foto.' })
  }
}
