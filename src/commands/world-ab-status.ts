import arg from 'arg'
import { fetch } from 'undici'

function statusLabel(status: string): string {
  switch (status) {
    case 'complete':
      return '✅ complete'
    case 'pending':
      return '⏳ pending'
    case 'failed':
      return '❌ failed'
    case 'obsolete':
      return '🗑️  obsolete'
    case 'fallback':
      return '🔄 fallback'
    default:
      return `⚠️  ${status}`
  }
}

type Scene = {
  entityId: string
  parcels: string[]
  entity: {
    pointers: string[]
    metadata: { display?: { title?: string }; scene?: { base?: string } }
  }
}

type RegistryEntity = {
  id: string
  pointers: string[]
  status: string
  versions: { assets: Record<string, { version: string; buildDate: string }> }
}

export default async function () {
  const args = arg({
    '--world': String,
    '--env': String
  })

  const world = args['--world']
  if (!world) {
    throw new Error('--world is required')
  }

  const env = args['--env'] || 'org'
  const worldsUrl = `https://worlds-content-server.decentraland.${env}`
  const registryUrl = `https://asset-bundle-registry.decentraland.${env}`

  // Step 1: Discover scenes
  console.log(`> Fetching scenes for world: ${world} (${env})`)
  const scenesResponse = await fetch(`${worldsUrl}/world/${encodeURIComponent(world)}/scenes`)

  if (!scenesResponse.ok) {
    throw new Error(`worlds-content-server returned ${scenesResponse.status}`)
  }

  const { scenes } = (await scenesResponse.json()) as { scenes: Scene[] }

  if (!scenes.length) {
    console.log('> No scenes found')
    return
  }

  console.log(`> Found ${scenes.length} scene(s)`)

  // Collect all pointers and build a map of entityId per pointer
  const allPointers: string[] = []
  const entityIdByPointer = new Map<string, string>()

  for (const scene of scenes) {
    const name = scene.entity.metadata?.display?.title || 'Untitled'
    const base = scene.entity.metadata?.scene?.base || scene.parcels[0]
    console.log(`\n  Scene: ${name} (base: ${base}, parcels: ${scene.parcels.length})`)
    console.log(`  Entity ID: ${scene.entityId}`)

    for (const pointer of scene.parcels) {
      allPointers.push(pointer)
      entityIdByPointer.set(pointer, scene.entityId)
    }
  }

  // Step 2: Check Asset Bundle Registry
  console.log(`\n> Querying asset bundle registry...`)
  const registryResponse = await fetch(`${registryUrl}/entities/active?world_name=${encodeURIComponent(world)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pointers: allPointers })
  })

  if (!registryResponse.ok) {
    console.log(`> Asset Bundle Registry: ❌ (returned ${registryResponse.status})`)
    return
  }

  const registryEntities = (await registryResponse.json()) as RegistryEntity[]

  if (!registryEntities.length) {
    console.log('> Asset Bundle Registry: no entities found (never converted)')
    return
  }

  // Match registry entities back to scenes
  const registryByEntityId = new Map<string, RegistryEntity>()
  for (const entry of registryEntities) {
    registryByEntityId.set(entry.id, entry)
  }

  console.log('')
  for (const scene of scenes) {
    const name = scene.entity.metadata?.display?.title || 'Untitled'
    const base = scene.entity.metadata?.scene?.base || scene.parcels[0]

    // Find the registry entry that covers this scene's pointers
    const registryEntry = registryEntities.find((e) => e.pointers.some((p) => scene.parcels.includes(p)))

    console.log(`> Scene: ${name} (base: ${base})`)
    console.log(`  Deployed entity: ${scene.entityId}`)

    if (!registryEntry) {
      console.log(`  Registry: ❌ not found (never converted)`)
      continue
    }

    const idMatch = registryEntry.id === scene.entityId
    console.log(`  Registry entity: ${registryEntry.id}`)
    console.log(`  Entity ID match: ${idMatch ? '✅' : '🚨 STALE — registry has different entity'}`)
    console.log(`  Status: ${statusLabel(registryEntry.status)}`)

    const platforms = ['windows', 'mac', 'webgl']
    console.log('  Versions:')
    for (const platform of platforms) {
      const version = registryEntry.versions?.assets?.[platform]
      const versionStr = version ? `v${version.version} (${version.buildDate})` : 'N/A'
      console.log(`    ${platform.padEnd(10)} ${versionStr}`)
    }
  }
}
