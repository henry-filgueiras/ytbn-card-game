SHELL := /bin/zsh
NPM := npm

.PHONY: help install dev build test preview clean

help:
	@printf "%s\n" \
		"Available targets:" \
		"  make install  Install dependencies" \
		"  make dev      Start the local dev server" \
		"  make test     Run the test suite" \
		"  make build    Create a production build" \
		"  make preview  Preview the production build" \
		"  make clean    Remove build output"

install: package.json package-lock.json
	$(NPM) install

dev:
	$(NPM) run dev

test:
	$(NPM) test

build:
	$(NPM) run build

preview:
	$(NPM) run preview

clean:
	rm -rf dist
