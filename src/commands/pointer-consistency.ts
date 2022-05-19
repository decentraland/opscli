import arg from "arg"
import { ago } from "../helpers/ago"
import { assert } from "../helpers/assert"
import { daoCatalysts, fetchEntityByPointer, fetchWearablesByAddress, Network } from "../helpers/catalysts"

export default async function () {
  const args = arg({
    "--pointer": String,
  })

  let pointer = assert(args["--pointer"], "--pointer is missing")

  if (pointer.startsWith('\\')) {
    pointer = pointer.substring(1)
  }

  await getPointers(pointer)
}

type CatalystInfo = {
  url: string
  timestamp: number
  entityId: string
}

type Opts = {
  log: boolean
}

export async function getPointers(pointer: string, network: Network = 'mainnet', opts: Opts = { log: true }) {
  function logger(...args: any[]) {
    if (opts.log) {
      console.log(...args)
    }
  }

  const catalysts = await daoCatalysts(network, opts.log)

  logger(`> Fetching pointer in every catalyst: ${JSON.stringify(pointer)}`)

  const timestamps: Date[] = []
  const entityIds = new Set<string>()
  const catalystInfo: CatalystInfo[] = []

  for (const { baseUrl } of catalysts) {
    try {
      const result = await fetchEntityByPointer(baseUrl, pointer)
      const timestamp = result.deployments[0]?.localTimestamp
      const entityId = result.deployments[0]?.entityId || ''
      const date = new Date(timestamp)

      timestamps.push(date)
      entityIds.add(entityId)
      catalystInfo.push({ timestamp, entityId, url: baseUrl })

      logger(
        "  " +
          result.baseUrl.padEnd(45, " ") +
          date.toISOString() +
          ` (${ago(date)}) ` +
          entityId
      )
    } catch (err: any) {
      logger("  " + baseUrl.padEnd(45, " ") + err.message)
    }
  }

  timestamps.sort()

  const minDate = timestamps[0]
  const maxDate = timestamps[timestamps.length - 1]

  logger(
    `> PropagationTime: ${Math.floor((maxDate.getTime() - minDate.getTime()) / 1000)} seconds  `.padEnd(47, " ") +
      `${minDate.toISOString()} -> ${maxDate.toISOString()}`
  )
  logger(`> Convergent: ${entityIds.size == 1 ? "✅" : "❌"}`)
  return catalystInfo
}
