import { fetch } from "undici"

type Rollout = {
  percentage: number
  prefix: string
  version: string
  each1000sessions: number
}

type Rollouts = {
  map: Record<string, Rollout>
  rollout: {
    records: Record<string, [Rollout]>
  }
}

/**
 * @public
 */
export async function checkRollouts(domain: string): Promise<Rollouts> {
  const url = `https://${domain}`
  const res = await fetch(url, { headers: { "x-debug-rollouts": "true" } })
  if (!res.ok) throw new Error("Non-ok response from " + url)
  return res.json() as any
}
