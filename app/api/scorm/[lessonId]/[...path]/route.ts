import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MIME: Record<string, string> = {
  html: 'text/html', htm: 'text/html', css: 'text/css',
  js: 'application/javascript', mjs: 'application/javascript',
  json: 'application/json', xml: 'application/xml',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
  ico: 'image/x-icon', mp4: 'video/mp4', mp3: 'audio/mpeg',
  ttf: 'font/ttf', woff: 'font/woff', woff2: 'font/woff2',
}

function mime(filename: string) {
  return MIME[filename.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream'
}

export async function GET(
  _req: Request,
  { params }: { params: { lessonId: string; path: string[] } }
) {
  const supabase   = await createClient()
  const filePath   = `scorm/${params.lessonId}/${params.path.join('/')}`
  const filename   = params.path[params.path.length - 1]
  const contentType = mime(filename)
  const isHtml     = /\.html?$/i.test(filename)

  const { data, error } = await supabase.storage
    .from('course-content')
    .download(filePath)

  if (error || !data) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;background:#111;color:#f87171">
        <h2>SCORM: arquivo não encontrado</h2>
        <p>Caminho: <code>${filePath}</code></p>
        <p>Re-faça o upload do pacote SCORM no Studio para corrigir.</p>
      </body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  // Para arquivos HTML: injeta <base> apontando para o Supabase Storage
  // Isso faz todos os caminhos relativos (CSS, JS, imagens) resolverem
  // corretamente sem precisar reescrever nada manualmente.
  if (isHtml) {
    const html    = await data.text()
    const baseUrl = `/api/scorm/${params.lessonId}/`
    const modified = injectBase(html, baseUrl)
    return new NextResponse(modified, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  }

  // Outros arquivos: proxy transparente (fallback — normalmente servidos
  // direto pelo Supabase Storage via <base>, sem passar aqui)
  return new NextResponse(data, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

function injectBase(html: string, baseUrl: string): string {
  // Remove <base> existente (pode apontar para URL de produção do iSeazy)
  const withoutBase = html.replace(/<base[^>]*>/gi, '')
  // Injeta nosso <base> no início do <head>
  const baseTag = `<base href="${baseUrl}">`
  if (withoutBase.includes('<head>')) return withoutBase.replace('<head>', `<head>${baseTag}`)
  if (withoutBase.includes('<HEAD>')) return withoutBase.replace('<HEAD>', `<HEAD>${baseTag}`)
  return baseTag + withoutBase
}
