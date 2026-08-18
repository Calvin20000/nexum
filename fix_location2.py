with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

old = "    const url = 'https://maps.google.com/?q=' + loc.coords.latitude + ',' + loc.coords.longitude;\n"
old += "    const msg = 'location: ' + url;\n"
old += "    setText(msg);\n"

new = "    const lat = loc.coords.latitude;\n"
new += "    const lng = loc.coords.longitude;\n"
new += "    const url = 'https://maps.google.com/?q=' + lat + ',' + lng;\n"
new += "    const msg = 'location:' + lat + ',' + lng;\n"
new += "    setText(msg);\n"
new += "    setTimeout(() => {\n"
new += "      handleSend();\n"
new += "    }, 100);\n"

content = content.replace(old, new, 1)

with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
