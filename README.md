# @decentraland/opscli

Operations command line tool. You must login with NPM and your github user to use this command line.

## Login with Github to private NPM registry:

```
$ npm login --scope=@decentraland --registry=https://npm.pkg.github.com

> Username: USERNAME
> Password: TOKEN
> Email: PUBLIC-EMAIL-ADDRESS
```

More info: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry

### `query-rollout`

Usage:

```
$ npx @decentraland/opscli@next query-rollout --domain play.decentraland.zone --rolloutName _site

Current rollouts for domain "play.decentraland.zone" for this request
  ┌─────────────────────┬────────────┬─────────────────────────┬───────────────────────────────────┐
  │       (index)       │ percentage │         prefix          │              version              │
  ├─────────────────────┼────────────┼─────────────────────────┼───────────────────────────────────┤
  │        _site        │    100     │ '@dcl/explorer-website' │ '0.0.1-1133229304.commit-901ee9a' │
  │     @dcl/kernel     │    100     │      '@dcl/kernel'      │ '1.0.0-1133249286.commit-a9ca05e' │
  │ @dcl/unity-renderer │    100     │  '@dcl/unity-renderer'  │            '1.0.10553'            │
  └─────────────────────┴────────────┴─────────────────────────┴───────────────────────────────────┘
Raw data for rollout "_site" for domain "play.decentraland.zone"
  ┌─────────┬────────────┬───────────────────────────────────┐
  │ (index) │ percentage │              version              │
  ├─────────┼────────────┼───────────────────────────────────┤
  │    0    │    100     │ '0.0.1-1133229304.commit-901ee9a' │
  │    1    │    100     │ '0.0.1-1129066963.commit-a6c2178' │
  │    2    │    100     │ '0.0.1-1125482159.commit-645a9e8' │
  │    3    │    100     │ '0.0.1-1124920935.commit-57e48a2' │
  │    4    │    100     │ '0.0.1-1121248349.commit-0568cf7' │
  │    5    │    100     │ '0.0.1-1120296389.commit-cd95321' │
  │    6    │    100     │ '0.0.1-1120045215.commit-7d17a4e' │
  │    7    │    100     │ '0.0.1-1117962007.commit-cd75435' │
  │    8    │    100     │ '0.0.1-1117258971.commit-bee96ab' │
  │    9    │    100     │ '0.0.1-1114103774.commit-cfe9ba9' │
  │   10    │    100     │ '0.0.1-1114086203.commit-cc86da6' │
  │   11    │    100     │ '0.0.1-1105802712.commit-80b54a0' │
  │   12    │    100     │ '0.0.1-1105772932.commit-ff46bfb' │
  │   13    │    100     │ '0.0.1-1105284880.commit-32d26de' │
  │   14    │    100     │ '0.0.1-1094578839.commit-e8461eb' │
  │   15    │    100     │ '0.0.1-1092142520.commit-746716e' │
  │   16    │    100     │ '0.0.1-1091984380.commit-77a1383' │
  └─────────┴────────────┴───────────────────────────────────┘
```
