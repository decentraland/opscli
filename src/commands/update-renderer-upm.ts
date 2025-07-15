import arg from 'arg'
import { assert } from '../helpers/assert'
import simpleGit, { SimpleGit } from 'simple-git'
import { CliError } from '../bin'
import {
  changeJSONFile,
  getUPMRendererPath,
  manifestPath,
  packagesLockPath,
  validDesktopLocation
} from '../helpers/parse-utils'

const git: SimpleGit = simpleGit(process.cwd(), { binary: 'git' })

const getLastCommitHash = async (branch: string): Promise<string> => {
  const list = await git.listRemote(['https://github.com/decentraland/unity-renderer.git', branch])
  if (!list) {
    throw new CliError(`'${branch}' is not a valid branch.\n`)
  }
  return list.split('\t')[0]
}

export default async () => {
  const args = arg({
    '--branch': String,
    '--path': String
  })

  const branch = args['--branch']!
  const path = `${process.cwd()}/${args['--path']!}`

  assert(branch || path, '--branch and --path are missing')

  assert(
    validDesktopLocation(),
    'Invalid explorer-desktop location. Please set your terminal to a valid explorer-desktop repository.'
  )

  if (branch) {
    const commitHash = await getLastCommitHash(branch)

    const gitUrl = `git+https://github.com/decentraland/unity-renderer.git?path=unity-renderer/Assets#${branch}`

    changeJSONFile(packagesLockPath, (content: any): any => {
      content['dependencies']['com.decentraland.unity-renderer']['hash'] = commitHash
      content['dependencies']['com.decentraland.unity-renderer']['version'] = gitUrl
    })

    changeJSONFile(manifestPath, (content: any): any => {
      content['dependencies']['com.decentraland.unity-renderer'] = gitUrl
    })

    console.log(`Done! unity-renderer remote branch=${branch} hash=${commitHash}`)
  } else if (path) {
    const upmPath = getUPMRendererPath(path)

    assert(upmPath, 'Invalid file path. Please, set the location for the unity-render UPM')

    changeJSONFile(manifestPath, (content: any): any => {
      content['dependencies']['com.decentraland.unity-renderer'] = `file:${upmPath}`
    })

    console.log(`Done! unity-renderer local file=${upmPath}`)
  }
}
