import { AuthLinkType } from "@dcl/schemas"
import arg from "arg"
import { fetch } from "undici"
import { CliError } from "../bin"
import { assert } from "../helpers/assert"
import { queueConversion } from "../helpers/asset-bundles"
import { StringDecoder } from "string_decoder"

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

  let argStartPosition = args['--start-position']
  let argGrep = args['--grep']
  let shouldSkipUntilStartPosition = argStartPosition || false

  for (let i = 0; i < snapshotsCount; i++)
  {
    const hash = snapshotEntitiesToProcess[i].hash;
    const numberOfEntities = snapshotEntitiesToProcess[i].numberOfEntities
    console.log(`> (${i+1}/${snapshotsCount}) Fetching file ${hash} with ${numberOfEntities} entities`)
    const snapshotUrl = `${contentUrl}/contents/${hash}`
    
    await processSnapshot(snapshotUrl, async (line, index) => {
      const percent = (100 * (index / numberOfEntities)).toFixed(2)
      try {
        if (argGrep&& !line.match(argGrep)) return

        const entity = JSON.parse(line)

        if (shouldSkipUntilStartPosition)
        {
          if (entity.entityId == argStartPosition)
          {
            shouldSkipUntilStartPosition = false
          } else 
          {
            return;
          }
        }

        if (startDate <= entity.entityTimestamp && entity.entityType == snapshot) {
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

          console.log(`  (${i+1}/${snapshotsCount}) [${percent}%]`, entity.entityId, entity.pointers[0])
        }
      } catch (error) {
        console.log(error)
      }
    })
  }
  
  console.log(`Finished!`)
}

const processSnapshot = async (url:any, processLine: (line:string, index:number) => Promise<void>) => {
  const decoder = new StringDecoder('utf8');
  let remaining = '';

  try {
    const response = await fetch(url);
    if (!response.ok) throw new CliError(`Invalid response from ${url}`)

    let index = 0
    for await (const data of response.body) {
      const chunk = decoder.write(data);
      const lines = (remaining + chunk).split('\n');

      if (!chunk.endsWith('\n')) {
        remaining = lines.pop()!;
      } else {
        remaining = '';
      }

      for (const line of lines) {
        if (line.trim().startsWith('{')) {
          await processLine(line, index)
        }
        index++
        process.stdout.write(index + '\r')
      }
    }

    if (remaining) {
      if (remaining.trim().startsWith('{')) {
        await processLine(remaining, index)
      }
    }

  } catch (error) {
    console.error(`Failed to download file: ${error}`);
  }
};