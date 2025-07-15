import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { exec } from 'child_process'

export async function signGpgCleartext(payload: string) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'secret'))
  const filename = path.join(tmpDir, 'tmp.txt')
  await fs.writeFile(filename, payload)
  try {
    console.log('> Signing payload with GPG, if you are using a Yubikey, please press it')
    await new Promise((resolve, reject) => {
      exec(`gpg --clearsign ${filename}`, {}, (err, stdout, stderr) => {
        if (err === null) resolve(undefined)
        if (stderr) reject(stderr)
        else reject('Error while signing the secrets')
      })
    })

    return await fs.readFile(path.join(tmpDir, 'tmp.txt.asc'))
  } finally {
    try {
      if (tmpDir) {
        await fs.rm(tmpDir, { recursive: true })
      }
    } catch (e) {
      console.error(
        `An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`
      )
    }
  }
}
