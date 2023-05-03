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
    "--start-date": String,
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
  const snapshotReq = await fetch(`${contentUrl}/snapshots`)
  if (!snapshotReq.ok) throw new CliError(`Invalid snapshot response from ${contentUrl}/snapshots`)

  const snapshotsJson = await snapshotReq.json() as Array<any>
  const startDate = (args['--start-date'] ? new Date(args['--start-date']).getTime() : 0) || -1
  let snapshotEntitiesToProcess = Array<any>()

  // select valid snapshots based on the start date
  for (let i = 0; i < snapshotsJson.length; i++)
  {
    const value = snapshotsJson[i]
    const fromTime = value.timeRange.initTimestamp
    const toTime = value.timeRange.endTimestamp
    
    if (toTime >= startDate)
    {
      snapshotEntitiesToProcess.push(value)
    } 
  }

  const snapshotsCount = snapshotEntitiesToProcess.length;
  if (snapshotsCount == 0)
  {
    throw new CliError(`No snapshot entity found at time ${startDate}`)
  }

  let startPosition = -1
  let argStartPosition = args['--start-position']

  for (let i = 0; i < snapshotsCount; i++)
  {
    const hash = snapshotEntitiesToProcess[i].hash;

    console.log(`> (${i+1}/${snapshotsCount}) Fetching file ${hash} with ${snapshotEntitiesToProcess[i].numberOfEntities} entities`)
  
    const jsonNdReq = await fetch(`${contentUrl}/contents/${hash}`)
    if (!jsonNdReq.ok) throw new CliError(`Invalid response from ${contentUrl}/contents/${hash}`)
    const jsonNd = await jsonNdReq.text()
  
    const len = jsonNd.length
    console.log(`  File length ${(len / 1024 / 1024).toFixed(1)}MB`)
  
    let currentCursor = -1
    if (startPosition < 0)
    {
      startPosition = (argStartPosition ? jsonNd.indexOf(argStartPosition) : 0) || 0
      if (startPosition >= 0)
      {
        // after the start position is found, the next start position will always be 0
        currentCursor = startPosition
        startPosition = 0
      }
    } else {
      currentCursor = startPosition
    }
    if (currentCursor < 0)
    {
      console.log(`  skipped because of --start-position`)
      continue
    }
  
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
        if (startDate <= entity.entityTimestamp && entity.entityType == snapshot) {
          let prom = await queueConversion(abServer, {
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
          
          console.log(`  (${i+1}/${snapshotsCount}) [${percent}%]`, entity.entityId, entity.pointers[0])
        }
      }
    }
  }
  
  console.log(`Finished!`)
}
