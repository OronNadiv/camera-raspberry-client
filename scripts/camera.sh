#!/usr/bin/env bash

# This file starts the raspberry pi client.
# Follow installation instructions in the README.md file.
# Then place this file in the user's root directory.

cd ~/camera-raspberry-client
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" # This loads nvm
nvm use
export PRIVATE_KEY= # PASTE GENERATED PRIVATE KEY
export NODE_ENV=production
export LOGIN_URL= # https://<LOGIN_SERVER_URL>
export PUSH_URL= # https://<PUSH_SERVER_URL>
export STORAGE_URL= # https://<STORAGE_SERVER_URL>
npm start
