import * as fs from 'fs/promises'
import * as path from 'path'

export async function* recurseFolder(folder: string): AsyncIterable<string> {
  const dir = await fs.opendir(folder, { bufferSize: 4000 })
  for await (const entry of dir) {
    const resolved = path.resolve(folder, entry.name)
    if (entry.isDirectory()) yield* recurseFolder(resolved)
    else yield resolved
  }
}
