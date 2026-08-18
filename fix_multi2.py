with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

old = "    if (result.canceled || !result.assets.length) return;\n"
old += "    const asset = result.assets[0];"

new = "    if (result.canceled || !result.assets.length) return;\n"
new += "    if (result.assets.length > 1) {\n"
new += "      for (const a of result.assets) {\n"
new += "        await uploadAndSendImage(a.uri, a.width ?? 0, a.height ?? 0, a.mimeType ?? 'image/jpeg');\n"
new += "      }\n"
new += "      return;\n"
new += "    }\n"
new += "    const asset = result.assets[0];"

content = content.replace(old, new, 1)

with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
