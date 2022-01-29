import arg from "arg"
import { assert } from "../helpers/assert"
import { daoCatalysts, fetchEntityByPointer, fetchWearablesByAddress } from "../helpers/catalysts"

export default async function () {
  const args = arg({
    "--pointer": String,
  })

  const pointer = assert(args["--pointer"], "--pointer is missing")

  const catalysts = await daoCatalysts()

  console.log(`  Got ${catalysts.length} catalysts`)
  console.log(`> Fetching wearables in every catalyst`)

  for (let { baseUrl } of catalysts) {
    try {
      const result = await fetchEntityByPointer(baseUrl, pointer)
      console.log(
        "  " +
          result.baseUrl.padEnd(45, ' ') +
          new Date(result.deployments[0]?.entityTimestamp).toISOString() +
          " " +
          result.deployments[0]?.entityId
      )
    } catch (err: any) {
      console.log("  " + baseUrl.padEnd(45, ' ') + err.message)
    }
  }
}
