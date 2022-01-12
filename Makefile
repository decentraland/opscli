
ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

test:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand $(TESTARGS)

test-watch:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --watch $(TESTARGS)

build:
	@./node_modules/.bin/tsc -p tsconfig.json
	@chmod +x dist/bin.js

.PHONY: build test
