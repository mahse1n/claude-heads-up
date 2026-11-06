export type Step = { text: string; at: number; failed?: boolean; done?: boolean; secs?: number }

declare module 'claude-code' {
  interface PluginState {
    'heads-up': { current: Step | null; recent: Step[]; turnStart: number }
  }
}
