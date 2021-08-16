import fetch from "node-fetch"

type Rollout = {
  percentage: number
  prefix: string
  version: string
}

type Rollouts = {
  map: Record<string, Rollout>
  rollout: {
    records: Record<string, Rollout>
  }
}

export async function checkRollouts(domain: string): Promise<Rollouts> {
  const url = `https://${domain}`
  const res = await fetch(url, { headers: { "x-debug-rollouts": "true" } })
  if (!res.ok) throw new Error("Non-ok response from " + url)
  return res.json()
}
