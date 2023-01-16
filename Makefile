
ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

test:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand $(TESTARGS)

	# download a wearable and a scene
	./dist/bin.js download-entity \
	  --content-server https://peer.decentraland.org/content \
	  --pointer=13,-137 \
	  --pointer=urn:decentraland:off-chain:base-avatars:brown_pants

	# now try to re-deploy the base wearable
	./dist/bin.js deploy-entity \
		--dry \
		--content-server https://peer.decentraland.org/content \
		--entity-type wearable \
		--folder=urn:decentraland:off-chain:base-avatars:brown_pants \
		--pointer=urn:decentraland:off-chain:base-avatars:brown_pants \
		--private-key=bde921a4a4abc644cced18f632aed0b3d34b1b36bc16fd97721ade1b7178cfff

test-watch:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --watch $(TESTARGS)

build:
	@./node_modules/.bin/tsc -p tsconfig.json
	@chmod +x dist/bin.js

.PHONY: build test
