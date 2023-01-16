
ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

test:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand $(TESTARGS)
	./dist/bin.js download-entity \
	  --content-server https://peer.decentraland.org/content \
	  --pointer=13,-137 \
	  --pointer=urn:decentraland:off-chain:base-avatars:brown_pants

test-watch:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --watch $(TESTARGS)

build:
	@./node_modules/.bin/tsc -p tsconfig.json
	@chmod +x dist/bin.js

.PHONY: build test
