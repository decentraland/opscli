import arg from 'arg'
import { fetch } from 'undici'
import { CliError } from '../bin'
import { REPORTED_PLATFORMS, parseRegistry, registryUrlFor } from '../helpers/ab-registry'

// `<platform>PendingJobs`, each an ordered list of entity IDs waiting for that
// converter queue.
type QueueStatus = Record<string, string[]>

export default async function () {
  const args = arg({
    '--env': String,
    '--registry': String,
    '--cid': [String]
  })

  const env = args['--env'] || 'org'
  const registry = parseRegistry(args['--registry'], env)
  const cids = args['--cid'] || []

  const response = await fetch(`${registryUrlFor(registry, env)}/queues/status`)

  if (!response.ok) {
    throw new CliError(`! Registry returned ${response.status} for /queues/status`)
  }

  const queues = (await response.json()) as QueueStatus

  console.log(`> Queue status [${registry}] (${env})`)

  for (const platform of REPORTED_PLATFORMS) {
    const jobs = queues[`${platform}PendingJobs`]

    if (!jobs) {
      console.log(`  ${platform.padEnd(10)} no queue reported`)
      continue
    }

    console.log(`  ${platform.padEnd(10)} ${jobs.length} pending job(s)`)

    // Positions are 1-indexed: the next entity to be converted is #1.
    for (const cid of cids) {
      const index = jobs.indexOf(cid)
      console.log(`    ${cid}: ${index === -1 ? 'not in queue' : `position #${index + 1} of ${jobs.length}`}`)
    }
  }
}
