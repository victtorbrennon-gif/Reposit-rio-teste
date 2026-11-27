@echo off
chcp 65001 >nul
set /p CLIENTE=Nome da pasta do cliente (minusculas e hifen, ex.: barbearia-do-joao): 
cd /d "%~dp0sitebuilder"
call npm run fabrica -- --novo %CLIENTE%
if errorlevel 1 (pause & exit /b 1)
echo.
echo Abrindo a pasta: coloque o logo, as fotos e preencha a ficha.txt
start "" "%~dp0clientes\%CLIENTE%"
pause
