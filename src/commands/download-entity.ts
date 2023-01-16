import arg from "arg"
import { assert } from "../helpers/assert"
import { downloadEntityAndMetadata, getEntities } from "../helpers/downloads"

export default async () => {
  const args = arg({
    "--pointer": [String],
    "--content-server": String,
    "--out": String,
  })

  const pointers = args["--pointer"]!

  assert(pointers.length > 0, "--pointer is missing")

  const server = (args["--content-server"] || "https://peer.decentraland.org/content").replace(/\/$/, "")
  const out = args["--out"] || process.cwd()

  const entities = await getEntities(pointers, server)
  for (const entity of entities) {
    console.log(`Downloading entity ${entity.pointers[0]}`)
    await downloadEntityAndMetadata(entity, server, out)
  }
}
