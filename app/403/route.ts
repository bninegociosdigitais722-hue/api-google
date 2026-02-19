import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export function GET() {
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Acesso negado</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; background: #0b0d12; color: #e6e9ef; margin: 0; }
      main { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
      .card { max-width: 520px; background: #151a23; border: 1px solid #1f2530; border-radius: 16px; padding: 28px; }
      h1 { font-size: 20px; margin: 0 0 8px; }
      p { margin: 0; color: #b3bac6; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main>
      <div class="card">
        <h1>Acesso negado (403)</h1>
        <p>Não foi possível resolver o tenant para esta solicitação. Complete o onboarding ou verifique sua associação.</p>
      </div>
    </main>
  </body>
</html>`

  return new NextResponse(html, {
    status: 403,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
