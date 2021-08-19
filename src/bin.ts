#!/usr/bin/env node

import { checkRollouts } from "."
import arg from "arg"

function assert(cond: any, message: string) {
  if (!cond) throw new Error(message)
}

export class CliError extends Error {}

const commands = {
  async ["query-rollout"]() {
    const args = arg({
      "--domain": String,
      "--rolloutName": String,
    })

    const domain = args["--domain"]!

    assert(domain, "--domain is missing")

    const rollouts = await checkRollouts(domain)

    console.group(`Current rollouts for domain "${domain}" for this request`)
    console.table(rollouts.map)
    console.groupEnd()

    const rolloutName = args["--rolloutName"]

    if (rolloutName) {
      console.group(`Raw data for rollout "${rolloutName}" for domain "${domain}"`)

      const rollout = rollouts.rollout.records[rolloutName]

      // Simulate the distribution for 1000 sessions
      let totalSessions = 1000.0
      for (let i = 0; i < rollout.length; ++i) {
        rollout[i].each1000sessions = Math.round(totalSessions * rollout[i].percentage / 100.0)
        totalSessions -= rollout[i].each1000sessions
      }

      console.table(rollout, ["percentage", "version", "each1000sessions"])
      console.groupEnd()
    }
  },
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

  await commands[commandName]()
}

main().catch((err) => {
  if (err instanceof CliError) {
    console.log(err.message)
  } else {
    console.error(err)
  }
  process.exit(1)
})
