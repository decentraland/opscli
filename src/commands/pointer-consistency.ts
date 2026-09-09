import arg from 'arg'
import { fetch } from 'undici'
import { ago } from '../helpers/ago'
import { daoCatalysts, fetchEntityByPointer } from '../helpers/catalysts'
import {
  REPORTED_PLATFORMS,
  RegistryKind,
  formatVersion,
  parseRegistry,
  registryUrlFor,
  statusLabel,
  versionSeriesNote
} from '../helpers/ab-registry'

function getEnvConfig(env: string) {
  if (env === 'today') {
    return {
      catalystUrls: ['https://peer-testing.decentraland.org'],
      peerUrl: 'https://peer-testing.decentraland.org'
    }
  }
  if (env === 'zone') {
    return { catalystUrls: ['https://peer.decentraland.zone'], peerUrl: 'https://peer.decentraland.zone' }
  }
  return { catalystUrls: null, peerUrl: 'https://peer.decentraland.org' } // null = fetch from DAO
}

async function resolvePointerFromCid(peerUrl: string, cid: string): Promise<string> {
  const response = await fetch(`${peerUrl}/content/entities/active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: [cid] })
  })

  if (!response.ok) {
    throw new Error(`Failed to resolve CID ${cid}: catalyst returned ${response.status}`)
  }

  const entities = (await response.json()) as Array<{ id: string; pointers: string[] }>

  if (!entities.length) {
    throw new Error(`No active entity found for CID ${cid}`)
  }

  const pointer = entities[0].pointers[0]
  console.log(`> Resolved CID ${cid} to pointer: ${pointer}`)
  return pointer
}

async function checkAssetBundleStatus(
  kind: RegistryKind,
  registryUrl: string,
  pointers: string[],
  expectedEntityId: string
): Promise<void> {
  try {
    const response = await fetch(`${registryUrl}/entities/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pointers })
    })

    if (!response.ok) {
      console.log(`> Asset Bundles: ❌ (registry returned ${response.status})`)
      return
    }

    const results = (await response.json()) as Array<{
      id: string
      pointers: string[]
      status: string
      versions: { assets: Record<string, { version: string; buildDate: string }> }
      bundles: {
        assets: Record<string, string>
      }
    }>

    if (!results.length) {
      console.log('> Asset Bundles: no data found')
      return
    }

    for (const entry of results) {
      const hashMatch = entry.id === expectedEntityId
      console.log(`> Asset Bundle Registry [${kind}] (pointer: ${entry.pointers.join(', ')}):`)
      console.log(`  Entity ID match: ${hashMatch ? '✅' : '❌'} registry=${entry.id}`)
      console.log(`  Global status: ${statusLabel(entry.status)}`)

      console.log('  Platform status:')
      for (const platform of REPORTED_PLATFORMS) {
        const assetStatus = entry.bundles?.assets?.[platform] || 'unknown'
        const versionStr = formatVersion(entry.versions?.assets?.[platform])

        console.log(`    ${platform.padEnd(10)} ${statusLabel(assetStatus).padEnd(4)} version: ${versionStr}`)
      }

      const note = versionSeriesNote(kind)
      if (note) {
        console.log(note)
      }
    }
  } catch (error: any) {
    console.log(`> Asset Bundles: ❌ (${error.message})`)
  }
}

export default async function () {
  const args = arg({
    '--pointer': String,
    '--cid': String,
    '--env': String,
    '--registry': String
  })

  const env = args['--env'] || 'org'
  const registry = parseRegistry(args['--registry'], env)
  const { catalystUrls, peerUrl } = getEnvConfig(env)

  let pointer = args['--pointer'] || (args['--cid'] ? await resolvePointerFromCid(peerUrl, args['--cid']) : null)
  if (!pointer) {
    throw new Error('--pointer or --cid is required')
  }

  if (pointer.startsWith('\\')) {
    pointer = pointer.substring(1)
  }

  const catalysts = catalystUrls
    ? catalystUrls.map((baseUrl) => ({ baseUrl, owner: '', id: '' }))
    : await daoCatalysts()

  console.log(`  Environment: ${env}`)
  console.log(`  Got ${catalysts.length} catalysts`)
  console.log(`> Fetching pointer in every catalyst: ${JSON.stringify(pointer)}`)

  const timestamps: Date[] = []
  const entityIds = new Set<string>()
  const deployments: Array<{ timestamp: Date; entityId: string }> = []

  for (const { baseUrl } of catalysts) {
    try {
      const result = await fetchEntityByPointer(baseUrl, pointer)
      const date = new Date(result.deployments[0]?.localTimestamp)
      const entityId = result.deployments[0]?.entityId

      console.log('  ' + result.baseUrl.padEnd(45, ' ') + date.toISOString() + ` (${ago(date)}) ` + entityId)

      timestamps.push(date)
      entityIds.add(entityId)
      deployments.push({ timestamp: date, entityId })
    } catch (err: any) {
      console.log('  ' + baseUrl.padEnd(45, ' ') + err.message)
    }
  }

  timestamps.sort()

  const minDate = timestamps[0]
  const maxDate = timestamps[timestamps.length - 1]

  console.log(
    `> PropagationTime: ${Math.floor((maxDate.getTime() - minDate.getTime()) / 1000)} seconds  `.padEnd(47, ' ') +
      `${minDate.toISOString()} -> ${maxDate.toISOString()}`
  )
  console.log(`> Convergent: ${entityIds.size === 1 ? '✅' : '❌'}`)

  // Check asset bundle status via registry
  if (deployments.length > 0) {
    const mostRecent = deployments.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    )
    console.log(`> Most recent deployment entity ID: ${mostRecent.entityId}`)
    await checkAssetBundleStatus(registry, registryUrlFor(registry, env), [pointer], mostRecent.entityId)
  }
}
