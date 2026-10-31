// Tiny, safe Markdown renderer (no dependency, no dangerouslySetInnerHTML).
// Supports: # headings, paragraphs, - / 1. lists, ``` code fences, | tables |,
// **bold**, *italic*, `code`, [links](url). Swap for react-markdown if you
// need more.

import type { ReactNode } from 'react'

function inline(text: string, key = 0): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    const k = `${key}-${i++}`
    if (t.startsWith('**')) out.push(<strong key={k} className="font-semibold text-fg">{t.slice(2, -2)}</strong>)
    else if (t.startsWith('`')) out.push(<code key={k} className="rounded bg-panel-2 px-1 py-0.5 font-mono text-[0.85em] text-fg">{t.slice(1, -1)}</code>)
    else if (t.startsWith('[')) {
      const [, label, href] = /\[([^\]]+)\]\(([^)]+)\)/.exec(t) ?? []
      const safe = /^(https?:|mailto:|\/|#)/.test(href ?? '') ? href : '#'
      out.push(<a key={k} href={safe} target="_blank" rel="noreferrer" className="text-accent underline-offset-2 hover:underline">{label}</a>)
    } else out.push(<em key={k}>{t.slice(1, -1)}</em>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ source }: { source: string }) {
  const rows = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  while (i < rows.length) {
    const line = rows[i]
    const key = blocks.length

    if (line.startsWith('```')) {
      const code: string[] = []
      i++
      while (i < rows.length && !rows[i].startsWith('```')) code.push(rows[i++])
      i++
      blocks.push(<pre key={key} className="overflow-x-auto rounded-lg border border-line bg-bg p-3 font-mono text-xs leading-relaxed text-muted">{code.join('\n')}</pre>)
      continue
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      const size = ['text-xl', 'text-base', 'text-sm', 'text-sm'][h[1].length - 1]
      blocks.push(<div key={key} className={`${size} mt-2 font-semibold text-fg`}>{inline(h[2], key)}</div>)
      i++
      continue
    }
    if (/^\s*\|/.test(line)) {
      const table: string[][] = []
      while (i < rows.length && /^\s*\|/.test(rows[i])) {
        if (!/^\s*\|[\s|:-]+\|\s*$/.test(rows[i])) table.push(rows[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
        i++
      }
      const [head, ...body] = table
      blocks.push(
        <div key={key} className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead><tr>{head?.map((c, j) => <th key={j} className="border border-line bg-panel-2 px-2 py-1.5 text-left font-medium">{inline(c)}</th>)}</tr></thead>
            <tbody>{body.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j} className="border border-line px-2 py-1.5 text-muted">{inline(c) || ' '}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      continue
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line)
      const items: string[] = []
      while (i < rows.length && /^\s*([-*]|\d+\.)\s+/.test(rows[i])) items.push(rows[i++].replace(/^\s*([-*]|\d+\.)\s*/, ''))
      const Tag = ordered ? 'ol' : 'ul'
      blocks.push(
        <Tag key={key} className={`${ordered ? 'list-decimal' : 'list-disc'} space-y-1 pl-5 text-muted marker:text-faint`}>
          {items.map((it, j) => <li key={j}>{it ? inline(it, j) : <span className="text-faint">…</span>}</li>)}
        </Tag>,
      )
      continue
    }
    if (!line.trim()) {
      i++
      continue
    }
    const para: string[] = []
    while (i < rows.length && rows[i].trim() && !/^(#{1,4}\s|```|\s*\||\s*([-*]|\d+\.)\s)/.test(rows[i])) para.push(rows[i++])
    blocks.push(<p key={key} className="leading-relaxed text-muted">{inline(para.join(' '), key)}</p>)
  }
  return <div className="space-y-3 text-sm">{blocks}</div>
}
