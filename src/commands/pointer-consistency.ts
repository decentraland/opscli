import arg from "arg"
import { fetch } from "undici"
import { ago } from "../helpers/ago"
import { assert } from "../helpers/assert"
import { daoCatalysts, fetchEntityByPointer, fetchWearablesByAddress } from "../helpers/catalysts"

async function checkAssetBundleAvailability(entityId: string): Promise<void> {
  const platforms = [
    { name: "WebGL", suffix: "" },
    { name: "Windows", suffix: "_windows" },
    { name: "Mac", suffix: "_mac" }
  ]

  console.log("> Asset Bundles:")
  
  for (const platform of platforms) {
    const url = `https://ab-cdn.decentraland.org/manifest/${entityId}${platform.suffix}.json`
    
    try {
      const response = await fetch(url)
      const status = response.status === 200 ? "✅" : "❌"
      console.log(`  ${platform.name.padEnd(8, " ")} ${status}`)
    } catch (error) {
      console.log(`  ${platform.name.padEnd(8, " ")} ❌`)
    }
  }
}

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
  const deployments: Array<{ timestamp: Date; entityId: string }> = []

  for (let { baseUrl } of catalysts) {
    try {
      const result = await fetchEntityByPointer(baseUrl, pointer)
      const date = new Date(result.deployments[0]?.localTimestamp)
      const entityId = result.deployments[0]?.entityId
      
      console.log(
        "  " +
          result.baseUrl.padEnd(45, " ") +
          date.toISOString() +
          ` (${ago(date)}) ` +
          entityId
      )
      
      timestamps.push(date)
      entityIds.add(entityId)
      deployments.push({ timestamp: date, entityId })
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

  // Check asset bundle availability for the most recent deployment
  if (deployments.length > 0) {
    // Find the most recent deployment
    const mostRecent = deployments.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    )
    
    console.log(`> Most recent deployment entity ID: ${mostRecent.entityId}`)
    await checkAssetBundleAvailability(mostRecent.entityId)
  }
}
