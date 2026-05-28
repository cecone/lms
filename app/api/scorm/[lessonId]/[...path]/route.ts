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

// Lista recursivamente todos os arquivos em scorm/{lessonId}/ no Storage.
// Supabase list() não é recursivo: precisa listar cada subpasta manualmente.
async function listAllFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  prefix: string,
  depth = 0
): Promise<string[]> {
  if (depth > 6) return []
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 500 })
  if (error || !data) return []

  const results: string[] = []
  await Promise.all(data.map(async (item) => {
    if (item.id === null) {
      // é uma pasta — lista recursivamente
      const sub = await listAllFiles(supabase, bucket, `${prefix}/${item.name}`, depth + 1)
      results.push(...sub)
    } else {
      results.push(`${prefix}/${item.name}`)
    }
  }))
  return results
}

export async function GET(
  _req: Request,
  { params }: { params: { lessonId: string; path: string[] } }
) {
  const supabase    = await createClient()
  const filePath    = `scorm/${params.lessonId}/${params.path.join('/')}`
  const filename    = params.path[params.path.length - 1]
  const contentType = mime(filename)
  const isHtml      = /\.html?$/i.test(filename)

  let { data, error } = await supabase.storage
    .from('course-content')
    .download(filePath)

  // Arquivo não encontrado no caminho exato: busca pelo nome em toda a pasta da aula.
  // Isso resolve pacotes onde o manifest aponta para "blank.html" mas o arquivo
  // foi armazenado em "content/blank.html" ou outra subpasta.
  if ((error || !data) && isHtml) {
    const allFiles = await listAllFiles(supabase, 'course-content', `scorm/${params.lessonId}`)
    const match = allFiles.find(f =>
      f.split('/').pop()?.toLowerCase() === filename.toLowerCase()
    )
    if (match) {
      console.log(`[scorm-proxy] fallback: ${filePath} → ${match}`)
      const res = await supabase.storage.from('course-content').download(match)
      data  = res.data
      error = res.error
      // Redireciona a URL canônica para o caminho correto (corrige próximas requisições)
      if (data && !error) {
        const correctPath = match.replace(/^scorm\/[^/]+\//, '')
        const redirectUrl = `/api/scorm/${params.lessonId}/${correctPath}`
        const html = await data.text()
        const baseUrl = `/api/scorm/${params.lessonId}/`
        const modified = injectBase(html, baseUrl)
        // Inclui header para que o player atualize a URL salva no banco
        return new NextResponse(modified, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Scorm-Correct-Path': redirectUrl,
          },
        })
      }
    }
  }

  if (error || !data) {
    const errMsg  = error?.message ?? 'sem dados retornados'
    const errCode = (error as any)?.statusCode ?? (error as any)?.status ?? '?'
    console.error(`[scorm-proxy] 404 filePath=${filePath} status=${errCode} msg=${errMsg}`)
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;padding:2rem;background:#111;color:#f87171">
        <h2>SCORM: arquivo não encontrado</h2>
        <p>Caminho: <code>${filePath}</code></p>
        <p>Erro Supabase: <code>${errCode} — ${errMsg}</code></p>
        <p>Re-faça o upload do pacote SCORM no Studio para corrigir.</p>
        <script>try{window.parent.postMessage({type:'scorm_error',message:'${errCode}: ${errMsg} | ${filePath}'},'*')}catch(e){}</script>
      </body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  // Para arquivos HTML: injeta <base> apontando para o proxy (mesmo domínio).
  if (isHtml) {
    const html     = await data.text()
    const baseUrl  = `/api/scorm/${params.lessonId}/`
    const modified = injectBase(html, baseUrl)
    return new NextResponse(modified, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  }

  return new NextResponse(data, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

function injectBase(html: string, baseUrl: string): string {
  const withoutBase = html.replace(/<base[^>]*>/gi, '')
  const baseTag = `<base href="${baseUrl}">`
  if (withoutBase.includes('<head>')) return withoutBase.replace('<head>', `<head>${baseTag}`)
  if (withoutBase.includes('<HEAD>')) return withoutBase.replace('<HEAD>', `<HEAD>${baseTag}`)
  return baseTag + withoutBase
}
