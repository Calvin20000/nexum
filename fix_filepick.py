with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

handler = "  const handlePickFile = async () => {\n"
handler += "    const result = await DocumentPicker.getDocumentAsync({\n"
handler += "      type: '*/*',\n"
handler += "      copyToCacheDirectory: true,\n"
handler += "    });\n"
handler += "    if (result.canceled || !result.assets?.[0]) return;\n"
handler += "    const file = result.assets[0];\n"
handler += "    Alert.alert('送信', file.name, [\n"
handler += "      { text: 'キャンセル', style: 'cancel' },\n"
handler += "      { text: '送信', onPress: async () => {\n"
handler += "        try {\n"
handler += "          const path = userId + '/' + Date.now() + '_' + file.name;\n"
handler += "          const url = await uploadImageToStorage(file.uri, 'chats', path, file.mimeType ?? 'application/octet-stream');\n"
handler += "        } catch (e) {\n"
handler += "          Alert.alert('error', 'failed');\n"
handler += "        }\n"
handler += "      }},\n"
handler += "    ]);\n"
handler += "  };\n\n"

old = "  const handlePickFromLibrary = async () => {"
new_code = handler + old

content = content.replace(old, new_code, 1)

with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
