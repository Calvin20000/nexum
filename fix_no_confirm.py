with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

old1 = "    setUploadError(null);\n"
old1 += "    setPendingImage({\n"
old1 += "      uri: asset.uri,\n"
old1 += "      mimeType: asset.mimeType ?? 'image/jpeg',\n"
old1 += "      width: asset.width,\n"
old1 += "      height: asset.height,\n"
old1 += "    });\n"
old1 += "  };\n"
old1 += "  const handlePickFromCamera"

new1 = "    setUploadError(null);\n"
new1 += "    await uploadAndSendImage(asset.uri, asset.mimeType ?? 'image/jpeg', asset.width, asset.height);\n"
new1 += "  };\n"
new1 += "  const handlePickFromCamera"

content = content.replace(old1, new1, 1)

old2 = "    setUploadError(null);\n"
old2 += "    setPendingImage({\n"
old2 += "      uri: asset.uri,\n"
old2 += "      mimeType: asset.mimeType ?? 'image/jpeg',\n"
old2 += "      width: asset.width,\n"
old2 += "      height: asset.height,\n"
old2 += "    });\n"
old2 += "  };"

new2 = "    setUploadError(null);\n"
new2 += "    await uploadAndSendImage(asset.uri, asset.mimeType ?? 'image/jpeg', asset.width, asset.height);\n"
new2 += "  };"

content = content.replace(old2, new2, 1)

with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
