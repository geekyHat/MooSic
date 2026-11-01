// ---------- Small helper ----------

export function EditorBlock({
  title,
  count,
  t,
  children,
}: {
  title: string
  count: number
  t: (key: string, vars?: Record<string, string | number>) => string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="text-xs text-muted">{t('editor.notesCount', { n: count })}</span>
      </div>
      {children}
    </div>
  )
}
