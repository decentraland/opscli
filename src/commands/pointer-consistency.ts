import arg from "arg"
import { ago } from "../helpers/ago"
import { assert } from "../helpers/assert"
import { daoCatalysts, fetchEntityByPointer, fetchWearablesByAddress } from "../helpers/catalysts"

export default async function () {
  const args = arg({
    "--pointer": String,
  })

  let pointer = assert(args["--pointer"], "--pointer is missing")

  if (pointer.startsWith('\\')) {
    pointer = pointer.substring(1)
  }

  const catalysts = await daoCatalysts()

  console.log(`  Got ${catalysts.length} catalysts`)
  console.log(`> Fetching pointer in every catalyst: ${JSON.stringify(pointer)}`)

  const timestamps: Date[] = []
  const entityIds = new Set<string>()

  for (let { baseUrl } of catalysts) {
    try {
      const result = await fetchEntityByPointer(baseUrl, pointer)
      const date = new Date(result.deployments[0]?.localTimestamp)
      console.log(
        "  " +
          result.baseUrl.padEnd(45, " ") +
          date.toISOString() +
          ` (${ago(date)}) ` +
          result.deployments[0]?.entityId
      )
      timestamps.push(date)
      entityIds.add(result.deployments[0]?.entityId)
    } catch (err: any) {
      console.log("  " + baseUrl.padEnd(45, " ") + err.message)
    }
  }

  timestamps.sort()

  const minDate = timestamps[0]
  const maxDate = timestamps[timestamps.length - 1]

  console.log(
    `> PropagationTime: ${Math.floor((maxDate.getTime() - minDate.getTime()) / 1000)} seconds  `.padEnd(47, " ") +
      `${minDate.toISOString()} -> ${maxDate.toISOString()}`
  )
  console.log(`> Convergent: ${entityIds.size == 1 ? "✅" : "❌"}`)
}
