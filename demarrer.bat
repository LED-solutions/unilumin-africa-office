@echo off
title Unilumin Africa Office
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js n est pas installe : https://nodejs.org ^(version LTS^) & pause & exit /b 1)
if not exist node_modules (echo Premiere installation... & call npm install --omit=dev)
node --no-warnings server\index.js
pause
