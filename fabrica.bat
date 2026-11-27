@echo off
chcp 65001 >nul
set CLIENTE=%~1
if "%CLIENTE%"=="" set /p CLIENTE=Qual cliente montar (nome da pasta): 
set /p VIDEO=Gravar video de demonstracao? (s/n): 
set EXTRA=
if /i "%VIDEO%"=="s" set EXTRA=--video
cd /d "%~dp0sitebuilder"
call npm run fabrica -- %CLIENTE% %EXTRA%
if not errorlevel 1 start "" "%~dp0clientes\%CLIENTE%\previa"
pause
