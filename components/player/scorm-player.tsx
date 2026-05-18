'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ScormPlayerProps {
  url: string
  onComplete: () => void
  completed?: boolean
}

export function ScormPlayer({ url, onComplete, completed }: ScormPlayerProps) {
  const doneRef = useRef(completed ?? false)
  const [done, setDone] = useState(completed ?? false)

  // Expõe a API SCORM no window do React (parent do iframe)
  // O iframe é servido pelo mesmo domínio (/api/scorm/...) → window.parent acessível
  useEffect(() => {
    function handleComplete() {
      if (doneRef.current) return
      doneRef.current = true
      setDone(true)
      onComplete()
    }

    // SCORM 1.2
    ;(window as any).API = {
      LMSInitialize:     () => 'true',
      LMSFinish:         () => { handleComplete(); return 'true' },
      LMSGetValue:       (e: string) => {
        if (e === 'cmi.core.lesson_status')  return doneRef.current ? 'completed' : 'not attempted'
        if (e === 'cmi.core.student_id')     return 'student_001'
        if (e === 'cmi.core.student_name')   return 'Aluno'
        if (e === 'cmi.core.lesson_mode')    return 'normal'
        if (e === 'cmi.core.entry')          return doneRef.current ? 'resume' : 'ab-initio'
        if (e === 'cmi.core.credit')         return 'credit'
        if (e === 'cmi.core.total_time')     return '00:00:00'
        if (e === 'cmi.core.score.min')      return '0'
        if (e === 'cmi.core.score.max')      return '100'
        if (e === 'cmi.suspend_data')        return ''
        if (e === 'cmi.launch_data')         return ''
        return ''
      },
      LMSSetValue: (e: string, v: string) => {
        if (e === 'cmi.core.lesson_status' && (v === 'completed' || v === 'passed')) handleComplete()
        return 'true'
      },
      LMSCommit:         () => 'true',
      LMSGetLastError:   () => '0',
      LMSGetErrorString: () => '',
      LMSGetDiagnostic:  () => '',
    }

    // SCORM 2004
    ;(window as any).API_1484_11 = {
      Initialize: () => 'true',
      Terminate:  () => { handleComplete(); return 'true' },
      GetValue:   (e: string) => {
        if (e === 'cmi.completion_status') return doneRef.current ? 'completed' : 'unknown'
        if (e === 'cmi.success_status')    return doneRef.current ? 'passed' : 'unknown'
        if (e === 'cmi.learner_id')        return 'student_001'
        if (e === 'cmi.learner_name')      return 'Aluno'
        if (e === 'cmi.entry')             return doneRef.current ? 'resume' : 'ab-initio'
        if (e === 'cmi.mode')              return 'normal'
        return ''
      },
      SetValue: (e: string, v: string) => {
        if ((e === 'cmi.completion_status' && v === 'completed') ||
            (e === 'cmi.success_status'    && v === 'passed')) handleComplete()
        return 'true'
      },
      Commit:            () => 'true',
      GetLastError:      () => '0',
      GetErrorString:    () => '',
      GetDiagnostic:     () => '',
    }

    return () => {
      delete (window as any).API
      delete (window as any).API_1484_11
    }
  }, [onComplete])

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <span className="text-xs text-[var(--muted)] uppercase tracking-wide">SCORM</span>
        {done && (
          <span className="flex items-center gap-1 text-xs font-bold text-[var(--green)] bg-[var(--green)]/10 border border-[var(--green)]/30 px-2 py-0.5 rounded-full">
            <CheckCircle size={11} /> Concluído
          </span>
        )}
      </div>

      {/* Iframe — mesmo domínio via rota proxy, SCORM API acessível via window.parent */}
      <iframe
        src={url}
        className="w-full border-0"
        style={{ height: '70vh' }}
        title="SCORM"
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
      />

      {/* Fallback manual para pacotes sem API automática */}
      {!done && (
        <div className="px-4 py-3 border-t border-[var(--border)] flex justify-end">
          <Button size="sm" variant="secondary"
            onClick={() => { doneRef.current = true; setDone(true); onComplete() }}>
            Marcar como concluído
          </Button>
        </div>
      )}
    </div>
  )
}
