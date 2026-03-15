.PHONY: run test build

PORT ?= 8080

run: ## Start a local dev server
	@echo "Serving at http://localhost:$(PORT)"
	@python3 -m http.server $(PORT)

test: ## Run all tests
	node --test scale-engine.test.js training-session.test.js

build: ## Validate that all required files exist and tests pass
	@echo "Checking required files..."
	@test -f index.html      || (echo "Missing index.html"      && exit 1)
	@test -f scale-engine.js || (echo "Missing scale-engine.js" && exit 1)
	@test -f manifest.json   || (echo "Missing manifest.json"   && exit 1)
	@test -f training-session.js || (echo "Missing training-session.js" && exit 1)
	@test -f service-worker.js || (echo "Missing service-worker.js" && exit 1)
	@echo "Running tests..."
	@node --test scale-engine.test.js training-session.test.js
	@echo "Build OK — all files present, all tests pass."
