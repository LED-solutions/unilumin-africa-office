@echo off
rem Utilise par le demarrage automatique de Windows (voir installer-demarrage-auto.bat). Ne pas fermer.
cd /d "%~dp0"
if not exist data mkdir data
node --no-warnings server\index.js >> data\serveur.log 2>&1
