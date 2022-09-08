#!/usr/bin/env node

export class CliError extends Error {}

const commands = {
  "query-rollout": "./commands/query-rollout",
  "wearables-consistency": "./commands/wearables-consistency",
  "pointer-consistency": "./commands/pointer-consistency",
  "update-renderer-upm": "./commands/update-renderer-upm",
  "secret-manager": "./commands/secret-manager",
  "parameters-manager": "./commands/parameters-manager"
}

async function main() {
  const commandName = process.argv[2] as keyof typeof commands

  if (!commandName || !commands[commandName]) {
    throw new CliError(
      "Invalid command. Possible are:\n" +
        Object.keys(commands)
          .map(($) => "  npx @dcl/opscli " + $ + "\n")
          .join("")
    )
  }

  const fn = require(commands[commandName]).default

  await fn()
}

main().catch((err) => {
  if (err instanceof CliError) {
    console.log(err.message)
  } else {
    console.error(err)
  }
  process.exit(1)
})
