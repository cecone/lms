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

const BLANK_NAMES = new Set(['blank.html', 'blank.htm', 'empty.html', 'placeholder.html'])

type FileEntry = { path: string; size: number }

async function listAllFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  prefix: string,
  depth = 0
): Promise<FileEntry[]> {
  if (depth > 6) return []
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 500 })
  if (error || !data) return []

  const results: FileEntry[] = []
  await Promise.all(data.map(async (item) => {
    if (item.id === null) {
      const sub = await listAllFiles(supabase, bucket, `${prefix}/${item.name}`, depth + 1)
      results.push(...sub)
    } else {
      const size = (item.metadata as any)?.size ?? 0
      results.push({ path: `${prefix}/${item.name}`, size })
    }
  }))
  return results
}

function pickBestHtml(files: FileEntry[], lessonPrefix: string): string | null {
  const htmlFiles = files.filter(f => /\.html?$/i.test(f.path))
  if (htmlFiles.length === 0) return null

  const PREFERRED = ['story_html5.html', 'story.html', 'index_lms.html', 'index.html', 'launch.html', 'main.html']

  for (const name of PREFERRED) {
    const found = htmlFiles
      .filter(f => f.path.split('/').pop()?.toLowerCase() === name)
      .sort((a, b) => b.size - a.size)[0]
    if (found) return found.path
  }

  const nonBlank = htmlFiles.filter(f => !BLANK_NAMES.has(f.path.split('/').pop()?.toLowerCase() ?? ''))
  const best = (nonBlank.length > 0 ? nonBlank : htmlFiles).sort((a, b) => b.size - a.size)[0]
  return best ? best.path : null
}

// Calcula o <base href> correto para um HTML armazenado em `storagePath`.
// Ex: storagePath = "scorm/{id}/content/blank.html"
//     → baseUrl   = "/api/scorm/{id}/content/"
// Assim todos os paths relativos do HTML resolvem para o diretório correto.
function baseUrlForPath(lessonId: string, storagePath: string): string {
  // Remove o prefixo "scorm/{id}/" para obter o path relativo à aula
  const relative = storagePath.replace(`scorm/${lessonId}/`, '')
  const dir = relative.includes('/') ? relative.substring(0, relative.lastIndexOf('/') + 1) : ''
  return `/api/scorm/${lessonId}/${dir}`
}

function serveHtml(html: string, baseUrl: string): NextResponse {
  const withoutBase = html.replace(/<base[^>]*>/gi, '')
  const baseTag     = `<base href="${baseUrl}">`
  let modified = withoutBase.includes('<head>')
    ? withoutBase.replace('<head>', `<head>${baseTag}`)
    : withoutBase.includes('<HEAD>')
      ? withoutBase.replace('<HEAD>', `<HEAD>${baseTag}`)
      : baseTag + withoutBase
  return new NextResponse(modified, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

export async function GET(
  _req: Request,
  { params }: { params: { lessonId: string; path: string[] } }
) {
  const supabase     = await createClient()
  const filePath     = `scorm/${params.lessonId}/${params.path.join('/')}`
  const filename     = params.path[params.path.length - 1]
  const contentType  = mime(filename)
  const isHtml       = /\.html?$/i.test(filename)

  let { data, error } = await supabase.storage.from('course-content').download(filePath)

  // Arquivo HTML não encontrado ou é um placeholder → busca o melhor launch
  if (isHtml && (error || !data || BLANK_NAMES.has(filename.toLowerCase()))) {
    let isReallyBlank = !!(error || !data)

    if (data && !error && BLANK_NAMES.has(filename.toLowerCase())) {
      const text = await data.text()
      isReallyBlank = text.replace(/<[^>]*>/g, '').trim().length < 50
      if (!isReallyBlank) {
        // blank.html tem conteúdo real — serve com base correta para o diretório do arquivo
        return serveHtml(text, baseUrlForPath(params.lessonId, filePath))
      }
    }

    if (isReallyBlank) {
      const allFiles  = await listAllFiles(supabase, 'course-content', `scorm/${params.lessonId}`)
      const bestPath  = pickBestHtml(allFiles, `scorm/${params.lessonId}`)
      if (bestPath) {
        console.log(`[scorm-proxy] fallback: ${filePath} → ${bestPath}`)
        const res = await supabase.storage.from('course-content').download(bestPath)
        if (res.data && !res.error) {
          const html = await res.data.text()
          // <base> aponta para o DIRETÓRIO do arquivo real encontrado
          return serveHtml(html, baseUrlForPath(params.lessonId, bestPath))
        }
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

  if (isHtml) {
    const html = await data.text()
    return serveHtml(html, baseUrlForPath(params.lessonId, filePath))
  }

  return new NextResponse(data, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
