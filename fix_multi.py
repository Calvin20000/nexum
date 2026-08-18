with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

old = "    if (result.canceled || !result.assets.length) return;\n"
old += "    const asset = result.assets[0];\n"
old += "    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {\n"
old += "      Alert.alert('ファイルサイズエラー', '10MB以下の画像を選択してください。');\n"
old += "      return;\n"
old += "    }\n"
old += "    setUploadError(null);\n"
old += "    setPendingImage({\n"
old += "      uri: asset.uri,\n"
old += "      mimeType: asset.mimeType ?? 'image/jpeg',\n"
old += "      width: asset.width,\n"
old += "      height: asset.height,\n"
old += "    });"

new = "    if (result.canceled || !result.assets.length) return;\n"
new += "    if (result.assets.length > 1) {\n"
new += "      for (const asset of result.assets) {\n"
new += "        const mime = asset.mimeType ?? 'image/jpeg';\n"
new += "        const path = userId + '/' + Date.now() + '.jpg';\n"
new += "        const url = await uploadImageToStorage(asset.uri, 'chats', path, mime);\n"
new += "        await sendImageMessage(url, asset.width, asset.height, mime);\n"
new += "      }\n"
new += "      return;\n"
new += "    }\n"
new += "    const asset = result.assets[0];\n"
new += "    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {\n"
new += "      Alert.alert('ファイルサイズエラー', '10MB以下の画像を選択してください。');\n"
new += "      return;\n"
new += "    }\n"
new += "    setUploadError(null);\n"
new += "    setPendingImage({\n"
new += "      uri: asset.uri,\n"
new += "      mimeType: asset.mimeType ?? 'image/jpeg',\n"
new += "      width: asset.width,\n"
new += "      height: asset.height,\n"
new += "    });"

content = content.replace(old, new, 1)

with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
