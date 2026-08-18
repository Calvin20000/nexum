with open('components/MessageBubble.tsx', 'r') as f:
    content = f.read()

old = "            {message.content?.startsWith('location:') ? ("

new = "            {message.content?.startsWith('file:') ? (\n"
new += "              <TouchableOpacity onPress={() => {\n"
new += "                const parts = message.content?.split(':') ?? [];\n"
new += "                const url = parts.slice(2).join(':');\n"
new += "                Linking.openURL(url);\n"
new += "              }}>\n"
new += "                <Text style={{fontSize:20}}>file</Text>\n"
new += "                <Text style={{color:'blue'}}>{message.content?.split(':')[1]}</Text>\n"
new += "              </TouchableOpacity>\n"
new += "            ) : message.content?.startsWith('location:') ? ("

if old in content:
    content = content.replace(old, new, 1)
    with open('components/MessageBubble.tsx', 'w') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('NOT FOUND')
