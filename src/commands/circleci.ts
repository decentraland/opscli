import arg from 'arg'
import { fetch } from 'undici'
import { assert } from '../helpers/assert'
import { tldFromEnv } from '../helpers/env-domains'
import { signGpgCleartext } from '../helpers/sign-gpg'

export default async function () {
  const args = arg({
    '--repo': String,
    '--branch': String
  })

  const repo = assert(args['--repo'], '--repo is missing')
  const branch = assert(args['--branch'], '--branch is missing')
  const envDomain = tldFromEnv('prd')

  const signed = await signGpgCleartext(`${repo}\n${branch}`)

  console.log('> Starting the pipeline...')
  const res = await fetch(`https://ops-lambdas.decentraland.${envDomain}/circleci`, {
    method: 'POST',
    body: signed.toString()
  })

  const response = await res.text()

  if (res.status !== 200) {
    throw new Error(`An error has occured while uploading the secret: ${response}`)
  }

  console.log('  OK! Response:')

  console.log(response)
}
