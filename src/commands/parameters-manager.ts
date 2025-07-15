import arg from 'arg'
import { fetch } from 'undici'
import { assert } from '../helpers/assert'
import { tldFromEnv } from '../helpers/env-domains'
import { signGpgCleartext } from '../helpers/sign-gpg'

export default async function () {
  const args = arg({
    '--env': String,
    '--name': String,
    '--value': String,
    '--update': Boolean,
    '--delete': Boolean
  })

  const env = assert(args['--env'], '--env is missing')
  const name = assert(args['--name'], '--name is missing')

  const hasValue = !!args['--value']
  const hasUpdate = !!args['--update']
  const hasDelete = !!args['--delete']

  if (hasDelete && hasValue) {
    throw new Error('Cannot use --delete with --value')
  } else if (!hasDelete && !hasValue) {
    throw new Error('You must provide either --value or --delete')
  }

  if (hasDelete && hasUpdate) {
    throw new Error('Cannot use --delete with --update')
  }

  const value = hasValue ? args['--value']! : ''

  const fileContent = [env, name, value].join('\n')

  const envDomain = tldFromEnv(env)

  const signed = await signGpgCleartext(fileContent)

  if (hasDelete) console.log('> Deleting the parameter...')
  else console.log('> Uploading the parameter...')

  const res = await fetch(`https://ops-lambdas.decentraland.${envDomain}/parameters-manager`, {
    method: hasDelete ? 'DELETE' : hasUpdate ? 'PUT' : 'POST',
    body: signed.toString()
  })

  const response = await res.text()

  if (res.status !== 200) {
    if (response.includes('ParameterAlreadyExists')) {
      throw new Error("That parameter already exists, please use '--update' if you want to update it")
    }
    throw new Error(`An error has occured while uploading the secret: ${response}`)
  }

  console.log('  OK! Response:')

  console.log(response)
}
