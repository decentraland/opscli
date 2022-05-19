import arg from "arg"
import fetch from "node-fetch"
import { assert } from "../helpers/assert"
import { daoCatalysts, fetchWearablesByAddress } from "../helpers/catalysts"

export default async function () {
  const args = arg({
    "--address": String,
  })

  const address = assert(args["--address"], "--address is missing")

  const catalysts = await daoCatalysts()

  console.log(`> Fetching wearables in every catalyst`)

  const results = await Promise.allSettled(catalysts.map(($) => fetchWearablesByAddress($.baseUrl, address)))

  for (let result of results) {
    if (result.status == "fulfilled") {
      console.log('  ' + result.value.baseUrl + ": " + result.value.wearables.length)
    } else {
      console.error(result.reason)
    }
  }
}
