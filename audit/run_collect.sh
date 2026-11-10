#!/bin/sh
# run inside playwright container
cd /work && [ -d node_modules/playwright ] || npm i -s playwright@1.55.0 >/dev/null 2>&1
node collect.mjs
