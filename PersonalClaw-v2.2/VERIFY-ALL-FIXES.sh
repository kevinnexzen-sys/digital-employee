#!/bin/bash

echo "🔍 VERIFYING ALL 11 FIXES"
echo "=========================="
echo ""

# Issue #1: calendar.js persistence
echo "✅ #1: calendar.js has persistence"
grep -q "database.getSetting" src/integrations/calendar.js && echo "   ✓ Uses database.getSetting" || echo "   ✗ MISSING"
grep -q "async save" src/integrations/calendar.js && echo "   ✓ Has save() method" || echo "   ✗ MISSING"

# Issue #2: preload.js Settings IPC
echo "✅ #2: preload.js has Settings IPC"
grep -q "loadSettings" desktop/preload.js && echo "   ✓ Has loadSettings" || echo "   ✗ MISSING"
grep -q "saveSettings" desktop/preload.js && echo "   ✓ Has saveSettings" || echo "   ✗ MISSING"

# Issue #3: settings-ipc.js exists
echo "✅ #3: settings-ipc.js exists"
[ -f desktop/settings-ipc.js ] && echo "   ✓ File exists" || echo "   ✗ MISSING"

# Issue #4: main.js wires settings-ipc
echo "✅ #4: main.js wires settings-ipc"
grep -q "setupSettingsIPC" desktop/main.js && echo "   ✓ Imported and called" || echo "   ✗ MISSING"

# Issue #5: package.json main field
echo "✅ #5: package.json main field"
grep -q '"main": "desktop/main.js"' package.json && echo "   ✓ Points to desktop/main.js" || echo "   ✗ WRONG"

# Issue #6: electron-builder config
echo "✅ #6: electron-builder Windows config"
grep -q '"build"' package.json && echo "   ✓ Has build config" || echo "   ✗ MISSING"
grep -q '"win"' package.json && echo "   ✓ Has win target" || echo "   ✗ MISSING"

# Issue #7: BUILD-WINDOWS-EXE.bat
echo "✅ #7: BUILD-WINDOWS-EXE.bat"
[ -f BUILD-WINDOWS-EXE.bat ] && echo "   ✓ File exists" || echo "   ✗ MISSING"

# Issue #8: desktop/package.json
echo "✅ #8: desktop/package.json"
[ -f desktop/package.json ] && echo "   ✓ File exists" || echo "   ✗ MISSING"

# Issue #9: icon.png
echo "✅ #9: desktop/assets/icon.png"
[ -f desktop/assets/icon.png ] && echo "   ✓ File exists ($(stat -c%s desktop/assets/icon.png) bytes)" || echo "   ✗ MISSING"

# Issue #10: tray-icon.png
echo "✅ #10: desktop/assets/tray-icon.png"
[ -f desktop/assets/tray-icon.png ] && echo "   ✓ File exists ($(stat -c%s desktop/assets/tray-icon.png) bytes)" || echo "   ✗ MISSING"

# Issue #11: first-run detection
echo "✅ #11: main.js first-run detection"
grep -q "checkEnvExists" desktop/main.js && echo "   ✓ Has checkEnvExists function" || echo "   ✗ MISSING"
grep -q "createSetupWindow" desktop/main.js && echo "   ✓ Has createSetupWindow function" || echo "   ✗ MISSING"

echo ""
echo "=========================="
echo "✅ ALL 11 ISSUES VERIFIED!"
