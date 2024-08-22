import arg from 'arg'
import fs from 'fs/promises'
import { fetch } from 'undici'
import { assert } from '../helpers/assert'
import { tldFromEnv } from '../helpers/env-domains'
import { signGpgCleartext } from '../helpers/sign-gpg'

export default async function () {
  const args = arg({
    '--env': String,
    '--name': String,
    '--secretFile': String,
    '--secret': String,
    '--update': Boolean,
    '--delete': Boolean
  })

  const env = assert(args['--env'], '--env is missing')
  const name = assert(args['--name'], '--name is missing')

  const hasSecretValue = !!args['--secret']
  const hasSecretFile = !!args['--secretFile']
  const hasUpdate = !!args['--update']
  const hasDelete = !!args['--delete']

  if (hasSecretValue && hasSecretFile) {
    throw new Error('Cannot use both --secretFile and --secret')
  }

  if (hasDelete && (hasSecretFile || hasSecretValue)) {
    throw new Error('Cannot use --delete with --secretFile or --secret')
  }

  if (hasDelete && hasUpdate) {
    throw new Error('Cannot use --delete with --update')
  }

  if (!hasDelete && !hasSecretValue && !hasSecretFile) {
    throw new Error('You must provide either --secretFile, --secret or --delete')
  }

  let secretContent = ''

  if (hasDelete) {
    secretContent = ''
  } else if (hasSecretValue) {
    secretContent = args['--secret']!
  } else if (hasSecretFile) {
    secretContent = (await fs.readFile(args['--secretFile']!)).toString()
  }

  const fileContent = [env, name, secretContent].join('\n')

  const envDomain = tldFromEnv(env)

  const signed = await signGpgCleartext(fileContent)

  if (hasDelete) {
    console.log('> Deleting the secrets...')
  } else {
    console.log('> Uploading the secrets...')
  }

  const res = await fetch(`https://ops-lambdas.decentraland.${envDomain}/secrets-manager`, {
    method: hasDelete ? 'DELETE' : hasUpdate ? 'PUT' : 'POST',
    body: signed.toString()
  })

  const response = await res.text()

  if (res.status !== 200) {
    if (response.includes('ResourceExistsException')) {
      throw new Error("That secret already exists, please use '--update' if you want to update it")
    }
    throw new Error(`An error has occured while uploading the secret: ${response}`)
  }

  console.log('  OK! Response:')

  console.log(response)
}
