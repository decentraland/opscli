import { SnapshotSyncDeployment } from '@dcl/schemas'
import arg from 'arg'
import { fetch } from 'undici'
import { CliError } from '../bin'
import { assert } from '../helpers/assert'
import { createFileWriter } from '../helpers/fileWriter'

async function* streamEntitiesFromSnapshot(contentUrl: string, snapshotHash: string) {
  console.log(`fetching: ${contentUrl}/contents/${snapshotHash}`)
  const jsonNdReq = await fetch(`${contentUrl}/contents/${snapshotHash}`)
  if (!jsonNdReq.ok) throw new CliError(`Invalid response from ${contentUrl}/contents/${snapshotHash}`)
  const jsonNd = await jsonNdReq.text()
  const len = jsonNd.length
  console.log(`  File length ${(len / 1024 / 1024).toFixed(1)}MB`)
  let currentCursor = 0
  let nextCursor = 0
  while ((nextCursor = jsonNd.indexOf('\n', currentCursor + 1)) !== -1) {
    const line = jsonNd.substring(currentCursor, nextCursor)
    currentCursor = nextCursor
    if (line.trim().startsWith('{')) {
      yield line
    }
  }
}

const ALL_TYPES_ARG = 'all-types'

export default async () => {
  const args = arg({
    '--entity-type': String,
    '--content-server': String,
    '--output-file': String
  })

  const entityType = args['--entity-type']

  assert(!!entityType, '--entity-type is missing')

  const outputFile = args['--output-file']

  assert(!!outputFile, '--output-file is missing')

  console.log(`>                 Parameters:`)
  const contentUrl = (args['--content-server'] || 'https://peer.decentraland.zone/content').replace(/\/$/, '')
  console.log(`                 Entity type: ${entityType}`)
  console.log(`              Content server: ${contentUrl}`)

  console.log(`> Fetching snapshots ${contentUrl}/snapshots`)
  const snapshotsReq = await fetch(`${contentUrl}/snapshots`)
  if (!snapshotsReq.ok) throw new CliError(`Invalid snapshot response from ${contentUrl}/snapshot`)

  const snapshotsJson = (await snapshotsReq.json()) as any
  for (const snapshot of snapshotsJson) {
    if (!('hash' in snapshot)) {
      throw new CliError(`Invalid snapshot ${snapshot}`)
    }
  }

  const snapshotHashes = snapshotsJson.map((s: any) => s.hash)
  console.log(snapshotHashes)
  const newSnapshotFile = await createFileWriter(outputFile || '')
  await newSnapshotFile.appendDebounced('### Decentraland json snapshot\n')
  for (const snapshotHash of snapshotHashes) {
    for await (const snapshotElem of streamEntitiesFromSnapshot(contentUrl, snapshotHash)) {
      const entity: SnapshotSyncDeployment = JSON.parse(snapshotElem)
      if (entityType === ALL_TYPES_ARG || entity.entityType === entityType) {
        await newSnapshotFile.appendDebounced(JSON.stringify(entity) + '\n')
      }
    }
  }
  await newSnapshotFile.close()

  console.log(`Finished!`)
}
