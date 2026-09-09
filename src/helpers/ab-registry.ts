import { CliError } from '../bin'

// Which asset bundle registry to read. The abgen generator (the Rust pipeline
// behind `--platform abgen`) publishes to its own registry, not the one the
// Unity converters write to.
export type RegistryKind = 'unity' | 'abgen'

// abgen only runs where the ab-admin has an abgen queue configured; `today` has
// none, and the registry hostname does not even resolve there.
const ABGEN_ENVS = ['org', 'zone']

// webgl is decommissioned, but both registries still return the key (empty, or a
// version years stale), so the status commands filter on this list instead of
// reporting whatever the payload happens to carry.
export const REPORTED_PLATFORMS = ['windows', 'mac']

function isRegistryKind(value: string): value is RegistryKind {
  return value === 'unity' || value === 'abgen'
}

export function parseRegistry(value: string | undefined, env: string): RegistryKind {
  const kind = value ?? 'unity'

  if (!isRegistryKind(kind)) {
    throw new CliError(`! Unknown --registry "${value}". Valid values are "unity" (default) and "abgen".`)
  }

  if (kind === 'abgen' && !ABGEN_ENVS.includes(env)) {
    throw new CliError(
      `! There is no abgen registry on "${env}" — abgen runs on ${ABGEN_ENVS.join(' and ')} only. ` +
        `Re-run without --registry abgen to read the Unity registry.`
    )
  }

  return kind
}

export function registryUrlFor(kind: RegistryKind, env: string): string {
  const host = kind === 'abgen' ? 'asset-bundle-registry-abgen' : 'asset-bundle-registry'
  return `https://${host}.decentraland.${env}`
}

export function statusLabel(status: string): string {
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

// abgen counts its bundle versions in its own series (v1003 at the time of
// writing) while the Unity converters are in another (v49). Neither is "newer"
// than the other, so say so rather than let the two be compared.
export function versionSeriesNote(kind: RegistryKind): string | null {
  return kind === 'abgen' ? '  (abgen versions are a separate series from the Unity converters)' : null
}
