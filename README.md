# dong-deps

[![NPM version](https://img.shields.io/npm/v/dong-deps.svg?style=flat-square)](https://npmjs.org/package/dong-deps)

> parse tree of spm dependencies

## Install

```bash
npm install -g dong-deps
```

## Usage

```js
var dependencies = deps({
  scope: 'spm/dependencies'
})

var devDependencies = deps({
  scope: 'spm/devDependencies'
})
```
