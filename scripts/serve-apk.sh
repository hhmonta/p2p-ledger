#!/bin/bash
cd /home/z/my-project/out
exec npx -y serve . -p 3000 -l tcp://0.0.0.0:3000
