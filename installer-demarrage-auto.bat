@echo off
rem Lance le site automatiquement au demarrage de Windows (meme sans ouvrir de session).
rem Clic droit sur ce fichier puis "Executer en tant qu administrateur".
cd /d "%~dp0"
net session >nul 2>&1 || (echo Faites clic droit puis "Executer en tant qu administrateur". & pause & exit /b 1)
where node >nul 2>nul || (echo Installez d abord Node.js LTS : https://nodejs.org & pause & exit /b 1)
if not exist node_modules call npm install --omit=dev
if not exist data mkdir data
schtasks /create /tn "Unilumin Africa Office" /tr "\"%~dp0serveur-service.bat\"" /sc onstart /ru SYSTEM /rl HIGHEST /f
rem Le PC ne doit pas se mettre en veille (sinon le site s arrete)
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
schtasks /run /tn "Unilumin Africa Office"
echo.
echo OK : le site tourne maintenant et redemarrera avec Windows.
echo Code d installation et journal : data\serveur.log
pause
