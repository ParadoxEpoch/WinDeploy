@echo off
cd %~dp0
TITLE WinDeploy Launcher

goto start

:ascii
echo.
echo  _      ___      ___           __         
echo ^| ^| /^| / (_)__  / _ \___ ___  / /__  __ __
echo ^| ^|/ ^|/ / / _ \/ // / -_) _ \/ / _ \/ // /
echo ^|__/^|__/_/_//_/____/\__/ .__/_/\___/\_, / 
echo                       /_/          /___/  
echo ------------------------------------------
echo             WinDeploy Launcher
echo ------------------------------------------
echo.
EXIT /B 0

:start
CALL :ascii
net session >nul 2>&1
if not %errorLevel% == 0 goto notAdmin
node index.js
echo Press any key to exit...
pause>nul
exit

:notAdmin
cls
CALL :ascii
echo !!!  This script needs to run as admin  !!!
echo.
echo Press any key to exit, then relaunch this tool as an admin
pause>nul
exit
