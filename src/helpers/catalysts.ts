import fetch from "node-fetch"

export type DAOCatalyst = {
  baseUrl: string
  owner: string
  id: string
}

export type Network = 'mainnet' | 'ropsten'
export async function daoCatalysts(network: Network = 'mainnet', log = true): Promise<Array<DAOCatalyst>> {
  const tld = network === 'mainnet' ? 'org' : 'zone'
  log && console.log("> Fetching DAO catalysts")
  const resp = await (await fetch(`https://peer.decentraland.${tld}/lambdas/contracts/servers`)).json()
  log && console.log(`  Got ${resp.length} catalysts`)
  return resp
}

export async function fetchWearablesByAddress(baseUrl: string, address: string) {
  return {
    baseUrl,
    wearables: (await fetch(`${baseUrl}/lambdas/collections/wearables-by-owner/${address}`).then(($) =>
      $.json()
    )) as Array<{ urn: string; amount: number }>,
  }
}

export async function fetchEntityByPointer(baseUrl: string, pointer: string) {
  return {
    baseUrl,
    deployments: (await fetch(`${baseUrl}/content/deployments?pointer=${encodeURIComponent(pointer)}&onlyCurrentlyPointed=true`).then(($) =>
      $.json()
    ).then($ => $.deployments)) as Array<{
      entityId: string
      entityVersion: string
      entityType: string
      entityTimestamp: number
      localTimestamp: number
      metadata: unknown
      pointers: string[]
      content: {key: string, hash: string}[]
     }>,
  }
}
