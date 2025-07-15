import { fetch } from 'undici'

export type DAOCatalyst = {
  baseUrl: string
  owner: string
  id: string
}

export async function daoCatalysts(): Promise<Array<DAOCatalyst>> {
  console.log('> Fetching DAO catalysts')
  return (await fetch('https://peer.decentraland.org/lambdas/contracts/servers').then(($) => $.json())) as any
}

export async function fetchWearablesByAddress(baseUrl: string, address: string) {
  return {
    baseUrl,
    wearables: (await fetch(`${baseUrl}/lambdas/collections/wearables-by-owner/${address}`).then(($) =>
      $.json()
    )) as Array<{ urn: string; amount: number }>
  }
}

export async function fetchEntityByPointer(baseUrl: string, pointer: string) {
  return {
    baseUrl,
    deployments: (await fetch(
      `${baseUrl}/content/deployments?pointer=${encodeURIComponent(pointer)}&onlyCurrentlyPointed=true`
    )
      .then(($) => $.json())
      .then(($: any) => $.deployments)) as Array<{
      entityId: string
      entityVersion: string
      entityType: string
      entityTimestamp: number
      localTimestamp: number
      metadata: unknown
      pointers: string[]
      content: { key: string; hash: string }[]
    }>
  }
}
