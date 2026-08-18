with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

old = "          const path = userId + '/' + Date.now() + '_' + file.name;\n"

new = "          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');\n"
new += "          const path = userId + '/' + Date.now() + '_' + safeName;\n"

content = content.replace(old, new, 1)

with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
