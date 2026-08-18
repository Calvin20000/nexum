with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

old = "          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');\n"
old += "          const path = userId + '/' + Date.now() + '_' + safeName;\n"
old += "          const url = await uploadImageToStorage(file.uri, 'chats', path, file.mimeType ?? 'application/octet-stream');\n"
old += "        } catch (e) {\n"
old += "          Alert.alert('error', 'failed');"

new = "          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');\n"
new += "          const path = userId + '/' + Date.now() + '_' + safeName;\n"
new += "          const mime = file.mimeType ?? 'application/octet-stream';\n"
new += "          const url = await uploadImageToStorage(file.uri, 'chats', path, mime);\n"
new += "          await uploadAndSendImage(file.uri, mime, 0, 0);\n"
new += "        } catch (e) {\n"
new += "          Alert.alert('error', String(e));"

if old in content:
    content = content.replace(old, new, 1)
    with open('app/chat/[id].tsx', 'w') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('NOT FOUND')
