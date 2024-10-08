import { AuthLinkType } from '@dcl/schemas'
import arg from 'arg'
import { fetch } from 'undici'
import { CliError } from '../bin'
import { assert } from '../helpers/assert'
import { productionAbAdmin, Platform, queueConversions } from '../helpers/asset-bundles'
import { StringDecoder } from 'string_decoder'
import { exit } from 'process'

// PROCESS AN ENTIRE SNAPSHOT

export default async () => {
  const args = arg({
    '--snapshot': String,
    '--world-name': String,
    '--content-server': String,
    '--start-position': String,
    '--start-date': String,
    '--grep': String,
    '--ab-server': String,
    '--platform': [String],
    '--token': String,
    '--prioritize': Boolean
  })

  const snapshot = args['--snapshot'] || 'wearable'
  const token = args['--token']!
  const abServer = args['--ab-server'] || productionAbAdmin
  const platforms = (args['--platform'] as Platform[]) || Object.values(Platform)
  const shouldPrioritize = !!args['--prioritize']

  assert(!!snapshot, '--snapshot is missing')
  assert(!!token, '--token is missing')
  platforms.forEach((platform) => assert(Object.values(Platform).includes(platform), `Invalid platform: ${platform}`))

  console.log(`>                 Parameters:`)
  const contentUrl = (args['--content-server'] || 'https://peer.decentraland.org/content').replace(/\/$/, '')
  console.log(`                 Platform(s): ${platforms.join(',')}`)
  console.log(`                 Entity type: ${snapshot}`)
  console.log(`              Content server: ${contentUrl}`)
  console.log(`         Asset bundle server: ${abServer}`)

  if (snapshot === 'worlds') {
    const specificWorld: string | undefined = args['--world-name']
    if (specificWorld) {
      await processWorld(abServer, token, specificWorld, shouldPrioritize, platforms)
    } else {
      await processWorlds(abServer, token, shouldPrioritize, platforms)
    }

    console.log(`Finished!`)
    return
  }

  console.log(`> Fetching snapshots`)
  const snapshotReq = await fetch(`${contentUrl}/snapshots`)
  if (!snapshotReq.ok) throw new CliError(`Invalid snapshot response from ${contentUrl}/snapshots`)

  const snapshotsJson = (await snapshotReq.json()) as Array<any>
  const startDate = (args['--start-date'] ? new Date(args['--start-date']).getTime() : 0) || -1
  const snapshotEntitiesToProcess = Array<any>()

  // select valid snapshots based on the start date
  for (let i = 0; i < snapshotsJson.length; i++) {
    const value = snapshotsJson[i]
    const toTime = value.timeRange.endTimestamp

    if (toTime >= startDate) {
      snapshotEntitiesToProcess.push(value)
    }
  }

  const snapshotsCount = snapshotEntitiesToProcess.length
  if (snapshotsCount === 0) {
    throw new CliError(`No snapshot entity found at time ${startDate}`)
  }

  const argStartPosition = args['--start-position']
  const argGrep = args['--grep']
  let shouldSkipUntilStartPosition = argStartPosition || false

  for (let i = 0; i < snapshotsCount; i++) {
    const hash = snapshotEntitiesToProcess[i].hash
    const numberOfEntities = snapshotEntitiesToProcess[i].numberOfEntities
    console.log(`> (${i + 1}/${snapshotsCount}) Fetching file ${hash} with ${numberOfEntities} entities`)
    const snapshotUrl = `${contentUrl}/contents/${hash}`

    await processSnapshot(snapshotUrl, async (line, index) => {
      const percent = (100 * (index / numberOfEntities)).toFixed(2)
      try {
        if (argGrep && !line.match(argGrep)) return

        const entity = JSON.parse(line)

        if (shouldSkipUntilStartPosition) {
          if (entity.entityId === argStartPosition) {
            shouldSkipUntilStartPosition = false
          } else {
            return
          }
        }

        if (startDate <= entity.entityTimestamp && entity.entityType === snapshot) {
          await tryRetryQueueConversion(abServer, entity.entityId, contentUrl, token, shouldPrioritize, platforms)

          console.log(`  (${i + 1}/${snapshotsCount}) [${percent}%]`, entity.entityId, entity.pointers[0])
        }
      } catch (error) {
        console.log(error)
      }
    })
  }

  console.log(`Finished!`)
}

const processWorlds = async (abServer: string, token: string, prioritize: boolean, platforms: Platform[]) => {
  console.log('Processing worlds.')
  const worldsIndexUrl = 'https://worlds-content-server.decentraland.org/index'
  const worldsContentUrl = 'https://worlds-content-server.decentraland.org/'

  const worldsReq = await fetch(worldsIndexUrl)
  if (!worldsReq.ok) throw new CliError(`Invalid response from ${worldsIndexUrl}`)
  const worldsJson = (await worldsReq.json()) as any
  if (!worldsJson.data) throw new CliError(`Json has invalid format`)
  const worlds = worldsJson.data as Array<any>
  const worldsCount = worlds.length

  for (let i = 0; i < worldsCount; i++) {
    const percent = (100 * (i / worldsCount)).toFixed(2)
    const world = worlds[i]
    const name = world.name
    const scenes = world.scenes as Array<any>

    for (let j = 0; j < scenes.length; j++) {
      const scene = scenes[j]

      console.log(`> [${percent}%]`, name, scene.id)

      await tryRetryQueueConversion(abServer, scene.id, worldsContentUrl, token, prioritize, platforms)
    }
  }
}

const processWorld = async (
  abServer: string,
  token: string,
  worldName: string,
  prioritize: boolean,
  platforms: Platform[]
) => {
  console.log(`Processing world: ${worldName}.`)
  const worldsIndexUrl = 'https://worlds-content-server.decentraland.org/index'
  const worldsContentUrl = 'https://worlds-content-server.decentraland.org/'

  const worldsReq = await fetch(worldsIndexUrl)
  if (!worldsReq.ok) throw new CliError(`Invalid response from ${worldsIndexUrl}`)
  const worldsJson = (await worldsReq.json()) as any
  if (!worldsJson.data) throw new CliError(`Json has invalid format`)
  const worlds = worldsJson.data as Array<any>

  if (worldName) {
    const world = worlds.find((f) => f.name === worldName)
    if (!world) {
      console.error(`World ${worldName} was not found in index. Cannot process.`)
    } else {
      console.log(`World ${world.name} was found in index. Processing.`)

      const scenes = world.scenes as Array<any>
      for (let j = 0; j < scenes.length; j++) {
        const scene = scenes[j]
        const percent = (100 * ((j + 1) / scenes.length)).toFixed(2)
        console.log(`> [${percent}%]`, world.name, scene.id)

        await tryRetryQueueConversion(abServer, scene.id, worldsContentUrl, token, prioritize, platforms)
      }
    }
  }
}

const tryRetryQueueConversion = async (
  abServer: string,
  entityId: string,
  contentUrl: string,
  token: string,
  prioritize: boolean,
  platforms: Platform[],
  retryCount: number = 0
) => {
  if (retryCount > 3) {
    console.log(`> ${abServer} ${entityId} retry count exceeded, please check your connection.`)
    exit(1)
  }
  try {
    await queueConversions(
      abServer,
      {
        entity: {
          entityId: entityId,
          authChain: [
            {
              type: AuthLinkType.SIGNER,
              payload: '0x0000000000000000000000000000000000000000',
              signature: ''
            }
          ]
        },
        contentServerUrls: [contentUrl]
      },
      token,
      prioritize,
      platforms
    )
  } catch (error) {
    console.log(`> Unexpected error, retrying in 5 seconds...`)
    await new Promise((f) => setTimeout(f, 5000))
    await tryRetryQueueConversion(abServer, entityId, contentUrl, token, prioritize, platforms, retryCount + 1)
  }
}

const processSnapshot = async (
  url: any,
  processLine: (line: string, index: number) => Promise<void>,
  retryCount: number = 0,
  skipToIndex: number = -1
) => {
  if (retryCount > 3) {
    console.error(`Failed downloading snapshot with url: ${url} after 3 retries.`)
    return
  }

  const decoder = new StringDecoder('utf8')
  let remaining = ''
  let index = 0
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new CliError(`Invalid response from ${url}`)
    }

    for await (const data of response.body ?? []) {
      const chunk = decoder.write(data)
      const lines = (remaining + chunk).split('\n')

      if (!chunk.endsWith('\n')) {
        remaining = lines.pop()!
      } else {
        remaining = ''
      }

      for (const line of lines) {
        if (skipToIndex < 0 || skipToIndex >= index) {
          if (line.trim().startsWith('{')) {
            await processLine(line, index)
          }
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
    console.error(`Failed downloading snapshot ${url}: ${error} \n      - Retrying in 5 seconds...`)
    await new Promise((f) => setTimeout(f, 5000))
    await processSnapshot(url, processLine, retryCount + 1, index)
  }
}
