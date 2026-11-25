@echo off
chcp 65001 >nul
echo ============================================
echo   Instalando a Fabrica de Sites (so 1 vez)
echo ============================================
cd /d "%~dp0sitebuilder"
call npm install || goto erro
call npx playwright install chromium || goto erro
python -m pip install -r fabrica\requisitos.txt
if errorlevel 1 py -m pip install -r fabrica\requisitos.txt || goto erro
echo.
echo Tudo pronto! Agora use novo-cliente.bat e fabrica.bat
pause
exit /b 0
:erro
echo.
echo Algo deu errado. Leia a mensagem acima ou peca ajuda ao Claude.
pause
exit /b 1
