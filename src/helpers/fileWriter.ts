import * as fs from 'fs'
import path from 'path'

export type IFile = {
  filePath: string
  appendDebounced: (buffer: string) => Promise<void>
  close: () => Promise<void>
}

async function checkFileExists(file: string): Promise<boolean> {
  return fs.promises
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false)
}

export async function createFileWriter(filename: string): Promise<IFile> {
  const filePath = path.resolve(filename)

  // if the process failed while creating the snapshot last time the file may still exists
  // deleting the staging tmpFile just in case
  if (await checkFileExists(filePath)) {
    await fs.promises.unlink(filePath)
  }

  const file = fs.createWriteStream(filePath)

  const fileClosedFuture = new Promise<void>((resolve, reject) => {
    file.on('finish', resolve)
    file.on('end', resolve)
    file.on('error', reject)
  })

  // the following lines exist to naively emulate a buffering algorithm to reduce disk IO
  // and thus, block the disk for less time using more memory
  const MAX_WRITE_BUFFER_SIZE = 1000
  const writeBuffer: Array<string> = []
  async function flush() {
    if (writeBuffer.length) {
      const buffer = writeBuffer.join('')
      writeBuffer.length = 0
      await new Promise<void>((resolve, reject) => {
        file.write(buffer, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    }
  }

  async function close() {
    await flush()
    file.close()
    await fileClosedFuture
  }

  return {
    filePath,
    async appendDebounced(buffer: string) {
      writeBuffer.push(buffer)
      if (writeBuffer.length >= MAX_WRITE_BUFFER_SIZE) {
        await flush()
      }
    },
    close
  }
}
