import { fetch } from "undici"
import { dirname, resolve } from "path"
import { mkdir, writeFile } from "fs/promises"
import { existsSync } from "fs"
import { Entity } from "@dcl/schemas"

export async function downloadEntity(entity: Entity, server: string, outFolder: string) {
  const destFolder = resolve(outFolder, entity.pointers[0])

  await mkdir(destFolder, { recursive: true })

  for (const x of entity.content) {
    const out = resolve(destFolder, x.file)
    if (!existsSync(out)) {
      await downloadFile(server, x.hash, out)
    } else {
      console.log(` ⚠️  File ${out} already exists, it won't be replaced by remote copy`)
      process.exitCode = 1
    }
  }

  return { destFolder }
}

export const downloadFile = async function (server: string, cid: string, filepath: string) {
  const data = await (await fetch(server + "/contents/" + cid)).arrayBuffer()

  await mkdir(dirname(filepath), { recursive: true })

  await writeFile(filepath, Buffer.from(data))
}

export async function getEntities(pointers: string[], sourceServer: string): Promise<Entity[]> {
  const url = `${sourceServer}/entities/active`
  const res = await fetch(url, {
    method: "post",
    body: JSON.stringify({ pointers }),
    headers: { "content-type": "application/json" },
  })

  const response = await res.text()

  if (!res.ok) {
    throw new Error("Error fetching list of active entities: " + response)
  }

  return JSON.parse(response)
}

export async function downloadEntityAndMetadata(entity: Entity, server: string, outFolder: string) {
  const { destFolder } = await downloadEntity(entity, server, outFolder)

  await writeFile(resolve(destFolder, ".metadata"), JSON.stringify(entity.metadata, null, 2))
  console.log("> Entity downloaded to " + destFolder)
}
