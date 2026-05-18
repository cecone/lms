export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight text-[var(--green)]">learn·studio</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Plataforma de aprendizado para criadores</p>
        </div>
        {children}
      </div>
    </div>
  )
}
