# heads-up

A Claude Code mod that gives you a live heads-up of what Claude is doing while it works.

While a turn runs, a small band above the prompt shows:

```
✓ Reading register.tsx
✓ Searching for "tool.call"
✗ Running: Type-check the mod
▶ Editing register.tsx · 42s
```

- **▶** the step Claude is on right now (or `Thinking…` between tool calls), with the turn's elapsed time
- **✓ / ✗** the last few steps and whether each one succeeded
- the current step is also shown in the status line

The band disappears when the turn ends. Subagent tool calls are ignored, so only the main conversation is shown.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install heads-up --marketplace mahse1n/claude-heads-up
```

Answer `y` to add the marketplace, then pick a scope (user scope is the default).

From a shell:

```
claude plugin install heads-up --marketplace mahse1n/claude-heads-up
```

In the desktop app: click **+** next to the prompt box → **Plugins** → **Add marketplace** with `mahse1n/claude-heads-up` → **Add plugin**.

## License

MIT
