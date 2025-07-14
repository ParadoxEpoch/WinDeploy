:::::::::::::::::::::::::::::::::::::::::::::::
::   -----     WinDeploy Elevator    -----   ::
::                                           ::
::   This script will invoke UAC to launch   ::
::        WinDeploy with admin rights        ::
:::::::::::::::::::::::::::::::::::::::::::::::
@echo off
TITLE WinDeploy Launcher
cls
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

:init
setlocal DisableDelayedExpansion
set cmdInvoke=1
set winSysFolder=System32
set "batchPath=%~0"
for %%k in (%0) do set batchName=%%~nk
set "vbsGetPrivileges=%temp%\OEgetPriv_%batchName%.vbs"
setlocal EnableDelayedExpansion

:checkPrivileges
NET FILE 1>NUL 2>NUL
if '%errorlevel%' == '0' ( goto gotPrivileges ) else ( goto getPrivileges )

:getPrivileges
if '%1'=='ELEV' (echo ELEV & shift /1 & goto gotPrivileges)
echo.
echo Requesting privilege escalation...

echo Set UAC = CreateObject^("Shell.Application"^) > "%vbsGetPrivileges%"
echo args = "ELEV " >> "%vbsGetPrivileges%"
echo For Each strArg in WScript.Arguments >> "%vbsGetPrivileges%"
echo args = args ^& strArg ^& " "  >> "%vbsGetPrivileges%"
echo Next >> "%vbsGetPrivileges%"

if '%cmdInvoke%'=='1' goto InvokeCmd 

echo UAC.ShellExecute "!batchPath!", args, "", "runas", 1 >> "%vbsGetPrivileges%"
goto ExecElevation

:InvokeCmd
echo args = "/c """ + "!batchPath!" + """ " + args >> "%vbsGetPrivileges%"
echo UAC.ShellExecute "%SystemRoot%\%winSysFolder%\cmd.exe", args, "", "runas", 1 >> "%vbsGetPrivileges%"

:ExecElevation
"%SystemRoot%\%winSysFolder%\WScript.exe" "%vbsGetPrivileges%" %*
exit /B

:gotPrivileges
setlocal & cd /d %~dp0
if '%1'=='ELEV' (del "%vbsGetPrivileges%" 1>nul 2>nul  &  shift /1)

::::::::::::::::::::::::::::::::::::::::::::::::
:: Run WinDeploy Launcher in Windows Terminal ::
::::::::::::::::::::::::::::::::::::::::::::::::
wt "%cd%\launcher.cmd"