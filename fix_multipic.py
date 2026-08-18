with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

a = 'quality: 0.8,\n'
a += '    });\n'
a += '    if (result.canceled || !result.assets[0]) return;'

b = 'quality: 0.8,\n'
b += '      allowsMultipleSelection: true,\n'
b += '      selectionLimit: 10,\n'
b += '    });\n'
b += '    if (result.canceled || !result.assets.length) return;'

content = content.replace(a, b)

with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
