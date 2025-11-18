#!/bin/sh
# If the process is running, return 0
if pgrep -f "index.js" > /dev/null; then
  exit 0
else
  exit 1
fi
