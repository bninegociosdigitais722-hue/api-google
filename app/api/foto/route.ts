import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref')
  const maxwidth = req.nextUrl.searchParams.get('maxwidth') ?? '400'

  if (!ref) {
    return NextResponse.json({ message: 'Parâmetro \"ref\" é obrigatório.' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ message: 'GOOGLE_MAPS_API_KEY não configurada.' }, { status: 500 })
  }

  try {
    const photoUrl = new URL('https://maps.googleapis.com/maps/api/place/photo')
    photoUrl.searchParams.set('photoreference', ref)
    photoUrl.searchParams.set('maxwidth', String(maxwidth))
    photoUrl.searchParams.set('key', apiKey)

    const gRes = await fetch(photoUrl.toString())

    if (!gRes.ok) {
      return NextResponse.json({ message: 'Erro ao buscar foto no Google.' }, { status: 502 })
    }

    const contentType = gRes.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await gRes.arrayBuffer())

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('[api/foto] erro', error)
    return NextResponse.json({ message: 'Erro interno ao obter foto.' }, { status: 500 })
  }
}
