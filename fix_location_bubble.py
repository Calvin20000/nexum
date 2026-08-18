with open('components/MessageBubble.tsx', 'r') as f:
    content = f.read()

old = "            <Text style={[styles.text, isOwn ? styles.textOwn : styles.textOther]}>\n"
old += "              {message.content}\n"
old += "            </Text>"

new = "            {message.content?.startsWith('location:') ? (\n"
new += "              <TouchableOpacity onPress={() => {\n"
new += "                const coords = message.content?.replace('location:', '');\n"
new += "                Linking.openURL('https://maps.google.com/?q=' + coords);\n"
new += "              }}>\n"
new += "                <Text style={{fontSize:20}}>location</Text>\n"
new += "                <Text style={{color:'blue'}}>Google Mapで開く</Text>\n"
new += "              </TouchableOpacity>\n"
new += "            ) : (\n"
new += "              <Text style={[styles.text, isOwn ? styles.textOwn : styles.textOther]}>\n"
new += "                {message.content}\n"
new += "              </Text>\n"
new += "            )}"

if old in content:
    content = content.replace(old, new, 1)
    with open('components/MessageBubble.tsx', 'w') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('NOT FOUND')
