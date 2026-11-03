#!/bin/sh
# Convenience launcher for the standalone desktop companion.
exec python3 "$(dirname "$0")/companion.py" "$@"
