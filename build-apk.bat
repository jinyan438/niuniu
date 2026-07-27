@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo    牛牛阅读器 APK 一键打包工具
echo ========================================
echo.

echo [1/3] 同步 Web 资源到 Android 项目...
call npx cap sync android
if %errorlevel% neq 0 (
    echo 错误: 同步失败！
    pause
    exit /b 1
)
echo.

echo [2/3] 编译 APK...
cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo 错误: 编译失败！
    cd ..
    pause
    exit /b 1
)
cd ..
echo.

echo [3/3] 复制 APK 到根目录...
copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "牛牛阅读器.apk" >nul
echo.

echo ========================================
echo    打包完成！
echo    APK 文件: 牛牛阅读器.apk
echo ========================================
pause
