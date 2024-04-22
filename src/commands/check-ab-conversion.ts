import { IPFSv1, IPFSv2 } from "@dcl/schemas"
import arg from "arg"
import { Response, fetch } from "undici"
import { assert } from "../helpers/assert"
import { getActiveEntities } from "../helpers/downloads"

export default async () => {
  const args = arg({
    "--cid": [String],
    "--pointer": [String],
    "--content-server": String,
    "--ab-cdn": String,
  })

  const pointers = args["--pointer"] || []
  const cids = args["--cid"] || []
  const abServer = args["--ab-cdn"] || "https://ab-cdn.decentraland.org"

  assert(pointers.length > 0 || cids.length > 0, "--pointer or --cid are required")

  const contentUrl = (args["--content-server"] || "https://peer.decentraland.org/content").replace(/\/$/, "")

  const entityIdsToConvert: { entityId: string, pointers: string[] }[] = []

  if (pointers.length) {
    for (const entity of await getActiveEntities(pointers, contentUrl)) {
      entityIdsToConvert.push({ entityId: entity.id, pointers: entity.pointers })
    }
  }

  for (const cid of cids) {
    if (IPFSv1.validate(cid) || IPFSv2.validate(cid)) {
      entityIdsToConvert.push({ entityId: cid, pointers: ['?'] })
    } else {
      console.log(`! Invalid CID: ${cid}. It will be ignored`)
    }
  }

  const check = async (entityId: string, pointers: string[], promise: Response) =>
  {
    if (!promise.ok) {
      const failManifest = await fetch(`${abServer}/manifest/${entityId}_failed.json`)
      if (failManifest.ok) {
        const manifest = await failManifest.json() as any
        console.log(`🟠 ${entityId} (${pointers[0]}): Failed. Version=${manifest.version} ExitCode=${manifest.exitCode} Date=${manifest.date} Log=${manifest.log}`)
      } else {
        console.log(`🔴 ${entityId} (${pointers[0]}): Not converted!`)
      }
    } else {
      const manifest = await promise.json() as any
      console.log(`🟢 ${entityId} (${pointers[0]}): Version=${manifest.version} ExitCode=${manifest.exitCode} Date=${manifest.date}`)
    }
  }

  for (const { entityId, pointers } of entityIdsToConvert) {
    const result = await fetch(`${abServer}/manifest/${entityId}.json`)
    const resultWindows = await fetch(`${abServer}/manifest/${entityId}_windows.json`)
    const resultMac = await fetch(`${abServer}/manifest/${entityId}_mac.json`)

    console.log("WEBGL")
    await check(entityId,pointers,result)
    
    console.log("WINDOWS")
    await check(entityId,pointers,resultWindows)

    console.log("MAC")
    await check(entityId,pointers,resultMac)
  }

  console.log(`Finished!`)

  
}


