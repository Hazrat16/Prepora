.PHONY: help install dev stop seed test test-e2e backup check env

help:
	@echo "make dev      Start everything on http://localhost:3000 (Ctrl+C stops it all)"
	@echo "make stop     Stop Supabase if it is still running (your data is kept)"
	@echo "make seed     Reload lessons and questions from content/"
	@echo "make backup   Save your database to backups/"
	@echo "make test     Run the unit tests"
	@echo "make test-e2e Run browser tests (needs make dev running)"
	@echo "make install  Install project dependencies"

check:
	@docker info >/dev/null 2>&1 || (echo "Docker is not running. Start Docker and try again." && exit 1)

install:
	npm install

# Writes the local Supabase address and keys that the app needs.
env:
	@npx supabase status -o env \
		--override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
		--override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY \
		--override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY 2>/dev/null \
		| grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)=' > .env.local

seed: env
	npx tsx --env-file=.env.local scripts/seed.ts

# Ctrl+C stops the app, then the exit trap stops Supabase too.
dev: check
	@! curl -s -o /dev/null -m 2 http://localhost:3000 || (echo "Port 3000 is already in use. Is make dev running in another terminal?" && exit 1)
	@test -d node_modules || npm install
	npx supabase start
	npx supabase migration up --local
	@$(MAKE) --no-print-directory seed
	@trap 'echo; echo "Stopping Supabase..."; npx supabase stop' EXIT; trap 'exit 130' INT TERM; npm run dev

stop:
	npx supabase stop

test:
	npx vitest run

test-e2e:
	npx playwright test

backup:
	@mkdir -p backups
	npx supabase db dump --local --data-only -f backups/data-$$(date +%Y%m%d-%H%M%S).sql
