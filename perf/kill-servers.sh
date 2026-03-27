#!/usr/bin/env bash
# Kill zombie perf server processes from this project
pids=$(ps aux | grep "plotly.js/perf/server" | grep -v grep | awk '{print $2}')
if [ -n "$pids" ]; then
    echo "Killing perf servers: $pids"
    kill $pids
else
    echo "No perf servers running"
fi
