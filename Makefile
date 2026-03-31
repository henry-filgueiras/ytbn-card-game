SHELL := /bin/zsh
NPM := npm

.PHONY: help install dev build test preview storyboard clean

help:
	@printf "%s\n" \
		"Available targets:" \
		"  make install  Install dependencies" \
		"  make dev      Start the local dev server" \
		"  make test     Run the test suite" \
		"  make build    Create a production build" \
		"  make preview  Preview the production build" \
		"  make storyboard  Render the storyboard PNG from the SVG source" \
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

storyboard: storyboard/semantic-lane-duel-storyboard.svg
	qlmanage -t -s 2200 -o storyboard storyboard/semantic-lane-duel-storyboard.svg >/dev/null
	mv storyboard/semantic-lane-duel-storyboard.svg.png storyboard/semantic-lane-duel-storyboard.png

clean:
	rm -rf dist
