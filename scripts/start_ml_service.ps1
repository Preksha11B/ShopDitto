# AI Shopping OS — Launch Multi-Agent ML Coordinator Service
$PythonExe = "D:\Anaconda\python.exe"
$CoordinatorScript = Join-Path $PSScriptRoot "..\src\backend\ml\coordinator.py"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting AI Shopping OS Multi-Agent ML Coordinator Service" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Python Executable : $PythonExe"
Write-Host "Coordinator Path  : $CoordinatorScript"
Write-Host "Service Port      : 8000"
Write-Host ""

& $PythonExe $CoordinatorScript --server --port 8000
