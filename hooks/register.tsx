import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Step } from '../types'

const current = atom({ plugin: 'heads-up', key: 'current' } as const, null)
const recent = atom({ plugin: 'heads-up', key: 'recent' } as const, [])
const turnStart = atom({ plugin: 'heads-up', key: 'turnStart' } as const, 0)

const MAX_RECENT = 4
const LINGER_MS = 10_000 // keep the band up this long after the turn ends

const short = (s: unknown, n = 60): string => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}
const base = (p: unknown): string => String(p ?? '').split('/').pop() || String(p ?? '')

function describe(e: Record<string, unknown>): string {
  const tool = String(e.tool)
  switch (tool) {
    case 'Bash':
      return `Running: ${short(e.description || e.command)}`
    case 'Read':
      return `Reading ${base(e.file_path)}`
    case 'Edit':
      return `Editing ${base(e.file_path)}`
    case 'Write':
      return `Writing ${base(e.file_path)}`
    case 'Grep':
      return `Searching for "${short(e.pattern, 40)}"`
    case 'Glob':
      return `Finding files ${short(e.pattern, 40)}`
    case 'WebFetch':
      return `Fetching ${short(e.url, 50)}`
    case 'WebSearch':
      return `Searching the web: ${short(e.query, 45)}`
    case 'Agent':
    case 'Task':
      return `Subagent: ${short(e.description, 50)}`
    case 'Skill':
      return `Using skill ${short(e.skill, 40)}`
    case 'TodoWrite':
      return 'Updating the task list'
    case 'AskUserQuestion':
      return 'Asking you a question'
    default:
      return tool.startsWith('mcp__') ? `Calling ${tool.split('__').slice(1).join(' › ')}` : `Using ${tool}`
  }
}

export const register: Register = on => {
  on('prompt.submit', async ($, e, next) => {
    await update($, recent, () => [])
    await update($, current, () => ({ text: 'Thinking…', at: 0 }))
    const t = await $.clock.now()
    await update($, turnStart, () => t)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e) // main loop only
    const step: Step = { text: describe(e as unknown as Record<string, unknown>), at: await $.clock.now() }
    await update($, current, () => step)
    $.ui.status(`⚡ ${step.text}`)

    const ran = await next(e)
    const failed = ran.deny !== undefined || (ran as { isError?: boolean }).isError === true
    await update($, recent, r => [...r, { ...step, failed }].slice(-MAX_RECENT))
    await update($, current, () => ({ text: 'Thinking…', at: 0 }))
    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const start = await read($, turnStart)
    const secs = start ? Math.max(0, Math.round(((await $.clock.now()) - start) / 1000)) : 0
    const doneAt = await $.clock.now()
    await update($, current, () => ({ text: 'Done', at: doneAt, secs, done: true }))
    $.ui.status(undefined)
    // Clear the band after a while, unless a new turn has started since.
    $.clock.after(LINGER_MS, () =>
      update($, current, c => (c?.done && c.at === doneAt ? null : c)),
    )
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const now = await read($, current)
    if (now === null || (!e.props.isWorking && !now.done)) return next(e)
    const past = await read($, recent)
    const start = await read($, turnStart)
    const secs = now.done
      ? (now.secs ?? 0)
      : start ? Math.max(0, Math.round(((await $.clock.now()) - start) / 1000)) : 0
    const width = Math.max(20, e.props.bodyColumns - 4)

    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {past.map((s, i) => (
          <Text key={`p${i}`} dimColor wrap="truncate">
            {s.failed ? '✗' : '✓'} {short(s.text, width)}
          </Text>
        ))}
        <Text key="now" wrap="truncate">
          {now.done ? <Text color="green" bold>■ </Text> : <Text color="cyan" bold>▶ </Text>}
          {short(now.text, width - 10)}
          <Text dimColor> · {secs}s</Text>
        </Text>
      </Box>
    )
  })
}
