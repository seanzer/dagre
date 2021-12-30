# Contributing

This doc is in a draft state. This repo is currently undergoing a transition to using
TypeScript and the Makefile is no longer up-to-date. The manual steps to build and create a
release will be documented here.

## Unit tests

Running the unit tests requires Chrome to be installed at a default chrome install location.
A _pretest_ script in **package.json** will build all sources before running tests.

Run unit tests using:

```
npm test
```

## Linting

This repository uses eslint to lint all source and test files.

## Build

The build will output files to the **out** directory.
```
npm build
```

## Known issues

- [] Built library not minified or optimized. Currently, using webpack to generate a library.
