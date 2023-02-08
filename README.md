# @dcl/opscli

Operations command line tool.

## Commands

### Validate deployment consistency

Check the active deployment by pointer on every catalyst, usage:

```
npx @dcl/opscli pointer-consistency --pointer "0,0"
```

### Schedule asset bundle conversion

```
npx @dcl/opscli queue-ab-conversion \
  --pointer "0,0" \
  --pointer "110,10" \
  --cid "110,10" \
  --token <ACCESS_TOKEN> \
  [--ab-server https://asset-bundle-converter.decentraland.org] \
  [--content-server https://peer.decentraland.org/content]
```

### `query-rollout`

Usage:

```
$ npx @dcl/opscli query-rollout --domain play.decentraland.zone --rolloutName _site

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



### `download-entity`

Downloads a specific entity from a content server, as specified in https://adr.decentraland.org/adr/ADR-79

It creates an extra file named `.metadata` including the deployment metadata. Which in some cases (wearables) is not present as a file in the deployed entity.

In the specified folder, it will create one

```
$ npx @dcl/opscli download-entity \
  --content-server https://play.decentraland.org/content \
  --pointer=0,0 \
  --pointer=urn:decentraland:off-chain:base-avatars:brown_pants \
  --out ~/Downloads
```

### `deploy-entity`

Deploys an entity to a content server

- `--pointer` Pointers of the entities, can be used many times, e.g. `--pointer=0,0 --pointer=0,1`
- `--entity-type` Entity type
- `--private-key` or `PRIVATE_KEY` env var
- `--dry` do everything except publishing the entity
- `--folder` to deploy, root level paths starting with `.` will be ignored, i.e. for .git folder. the `.metadata` file is required to create the entity

```
$ npx @dcl/opscli deploy-entity \
  --dry \
  --content-server https://peer.decentraland.org/content \
  --entity-type wearable \
  --folder=urn:decentraland:off-chain:base-avatars:brown_pants \
  --pointer=urn:decentraland:off-chain:base-avatars:brown_pants \
  --private-key=bde921a4a4abc644cced18f632aed0b3d34b1b36bc16fd97721ade1b7178cfff
```

### `query-rollout`

Usage:

```
$ npx @dcl/opscli query-rollout --domain play.decentraland.zone --rolloutName _site

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
