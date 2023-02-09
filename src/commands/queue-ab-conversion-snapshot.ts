import { AuthLinkType } from "@dcl/schemas"
import arg from "arg"
import { fetch } from "undici"
import { CliError } from "../bin"
import { assert } from "../helpers/assert"
import { queueConversion } from "../helpers/asset-bundles"

// PROCESS AN ENTIRE SNAPSHOT

export default async () => {
  const args = arg({
    "--snapshot": String,
    "--content-server": String,
    "--start-position": String,
    "--grep": String,
    "--ab-server": String,
    "--token": String
  })

  const snapshot = args["--snapshot"] || 'wearable'
  const token = args["--token"]!
  const abServer = args["--ab-server"] || "https://asset-bundle-converter.decentraland.org"

  assert(!!snapshot, "--snapshot is missing")
  assert(!!token, "--token is missing")

  console.log(`>                 Parameters:`)
  const contentUrl = (args["--content-server"] || "https://peer.decentraland.org/content").replace(/\/$/, "")
  console.log(`                 Entity type: ${snapshot}`)
  console.log(`              Content server: ${contentUrl}`)
  console.log(`         Asset bundle server: ${abServer}`)

  console.log(`> Fetching snapshots`)
  const snapshotReq = await fetch(`${contentUrl}/snapshot`)
  if (!snapshotReq.ok) throw new CliError(`Invalid snapshot response from ${contentUrl}/snapshot`)

  const snapshotsJson = await snapshotReq.json() as any

  if (!(snapshot in snapshotsJson.entities)) throw new CliError(`Invalid snapshot ${snapshot}`)
  const hash = snapshotsJson.entities[snapshot].hash

  console.log(`> Fetching file ${hash}`)

  const jsonNdReq = await fetch(`${contentUrl}/contents/${hash}`)
  if (!jsonNdReq.ok) throw new CliError(`Invalid response from ${contentUrl}/contents/${hash}`)
  const jsonNd = await jsonNdReq.text()

  const len = jsonNd.length
  console.log(`  File length ${(len / 1024 / 1024).toFixed(1)}MB`)

  let currentCursor = (args['--start-position'] ? jsonNd.indexOf(args['--start-position']) : 0) || -1
  let nextCursor = 0
  while ((nextCursor = jsonNd.indexOf('\n', currentCursor + 1)) != -1) {
    const line = jsonNd.substring(currentCursor, nextCursor)
    currentCursor = nextCursor
    if (line.trim().startsWith('{')) {
      const percent = (100 * (nextCursor / len)).toFixed(2)

      if (args['--grep']) {
        if (!line.match(args['--grep'])) {
          continue
        }
      }

      const entity = JSON.parse(line)


      await queueConversion(abServer, {
        entity: {
          entityId: entity.entityId, authChain: [
            {
              type: AuthLinkType.SIGNER,
              payload: '0x0000000000000000000000000000000000000000',
              signature: ''
            }
          ]
        }, contentServerUrls: [contentUrl]
      }, token)

      console.log(`[${percent}%]`, entity.entityId, entity.pointers[0])
    }
  }

  console.log(`Finished!`)
}
