import { IPFSv1, IPFSv2 } from "@dcl/schemas"
import arg from "arg"
import { fetch } from "undici"
import { assert } from "../helpers/assert"
import { getActiveEntities } from "../helpers/downloads"

export default async () => {
  const args = arg({
    "--cid": [String],
    "--pointer": [String],
    "--content-server": String,
    "--ab-cdn": String,
    "--ab-platform": String,
  })

  const pointers = args["--pointer"] || []
  const cids = args["--cid"] || []
  const abServer = args["--ab-cdn"] || "https://ab-cdn.decentraland.org"
  var abPlatform = args["--ab-platform"]
  
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

  let displayPlatform = 'WebGL'; // Default displayPlatform to 'WebGL'

  // Check if abPlatform is either 'windows' or 'mac'
  if (abPlatform) {
    if (abPlatform === 'windows' || abPlatform === 'mac') {
      displayPlatform = abPlatform; // Set displayPlatform to abPlatform if it's valid
      abPlatform = `_${abPlatform}`;
    } else {
      console.log(`! Invalid Platform: ${abPlatform}. Defaulting to WebGL`);
      abPlatform = '';
    }
  }

  for (const { entityId, pointers } of entityIdsToConvert) {
    // Construct the URL dynamically based on abPlatform
    const result = await fetch(`${abServer}/manifest/${entityId}${abPlatform}.json`);
    if (!result.ok) {
      const failManifest = await fetch(`${abServer}/manifest/${entityId}_failed.json`)
      if (failManifest.ok) {
        const manifest = await failManifest.json() as any
        console.log(`🟠 ${entityId} (${pointers[0]}): Failed. Version=${manifest.version} ExitCode=${manifest.exitCode} Date=${manifest.date} Log=${manifest.log} Platform=${displayPlatform}`)
      } else {
        console.log(`🔴 ${entityId} (${pointers[0]}): Not converted!`)
      }
    } else {
      const manifest = await result.json() as any
      console.log(`🟢 ${entityId} (${pointers[0]}): Version=${manifest.version} ExitCode=${manifest.exitCode} Date=${manifest.date} Platform=${displayPlatform}`)
    }
  }

  console.log(`Finished!`)
}
