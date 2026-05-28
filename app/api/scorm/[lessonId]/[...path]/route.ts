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

// Nomes de HTML que authoring tools usam como placeholder vazio
const BLANK_NAMES = new Set(['blank.html', 'blank.htm', 'empty.html', 'placeholder.html'])

type FileEntry = { path: string; size: number }

// Lista recursivamente todos os arquivos em um prefixo do Storage.
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

// Escolhe o melhor arquivo HTML de launch dentre todos os arquivos da aula.
// Prioridade: candidatos conhecidos > maior HTML > qualquer HTML.
// Exclui nomes de placeholder apenas quando há alternativa.
function pickBestHtml(files: FileEntry[], lessonId: string): string | null {
  const htmlFiles = files.filter(f => /\.html?$/i.test(f.path))
  if (htmlFiles.length === 0) return null

  const PREFERRED = ['story_html5.html','story.html','index_lms.html','index.html','launch.html','main.html']

  // 1. candidatos preferidos por nome (maior primeiro se empatar)
  for (const name of PREFERRED) {
    const found = htmlFiles
      .filter(f => f.path.split('/').pop()?.toLowerCase() === name)
      .sort((a, b) => b.size - a.size)[0]
    if (found) return found.path.replace(new RegExp(`^scorm/${lessonId}/`), '')
  }

  // 2. maior HTML que não seja placeholder
  const nonBlank = htmlFiles.filter(f => !BLANK_NAMES.has(f.path.split('/').pop()?.toLowerCase() ?? ''))
  const best = (nonBlank.length > 0 ? nonBlank : htmlFiles).sort((a, b) => b.size - a.size)[0]
  return best ? best.path.replace(new RegExp(`^scorm/${lessonId}/`), '') : null
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

  // Para HTML: se não encontrado OU se é um placeholder vazio, busca o melhor launch.
  if (isHtml && (error || !data || BLANK_NAMES.has(filename.toLowerCase()))) {
    const allFiles = await listAllFiles(supabase, 'course-content', `scorm/${params.lessonId}`)

    // Se o arquivo foi encontrado mas é um placeholder, verifica se é realmente pequeno
    let isReallyBlank = !!(error || !data)
    if (data && !error && BLANK_NAMES.has(filename.toLowerCase())) {
      const text = await data.text()
      isReallyBlank = text.replace(/<[^>]*>/g, '').trim().length < 50
      if (!isReallyBlank) {
        // blank.html tem conteúdo real — serve normalmente
        return serveHtml(text, params.lessonId)
      }
    }

    if (isReallyBlank) {
      const bestPath = pickBestHtml(allFiles, params.lessonId)
      if (bestPath) {
        console.log(`[scorm-proxy] redirect blank → ${bestPath}`)
        const res = await supabase.storage
          .from('course-content')
          .download(`scorm/${params.lessonId}/${bestPath}`)
        if (res.data && !res.error) {
          const html = await res.data.text()
          return serveHtml(html, params.lessonId)
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
    return serveHtml(html, params.lessonId)
  }

  return new NextResponse(data, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

function serveHtml(html: string, lessonId: string): NextResponse {
  const baseUrl  = `/api/scorm/${lessonId}/`
  const modified = injectBase(html, baseUrl)
  return new NextResponse(modified, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
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
