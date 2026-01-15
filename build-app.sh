#!/bin/bash

# 删除 dist/build 目录
rm -rf dist/build

# 执行构建命令
uni build -p app

# 创建目标目录
mkdir -p dist/build/app/unpackage/debug

# 将 android_debug.apk 拷贝回原位置
if [ -f 'HbuilderX/debug/android_debug.apk' ]; then
    cp -f HbuilderX/debug/android_debug.apk dist/build/app/unpackage/debug/android_debug.apk
else
    echo "Warning: HbuilderX/debug/android_debug.apk does not exist. Skipping copy back."
fi

if [ -f 'HbuilderX/debug/iOS_debug.ipa' ]; then
    cp -f HbuilderX/debug/iOS_debug.ipa dist/build/app/unpackage/debug/iOS_debug.ipa
else
    echo "Warning: HbuilderX/debug/iOS_debug.ipa does not exist. Skipping copy back."
fi
