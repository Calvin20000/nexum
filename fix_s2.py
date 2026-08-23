with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

old = "                }}\n              />"
new = "                }}\n              />\n"
new += "                <TouchableOpacity\n"
new += "                  style={{ padding: 8 }}\n"
new += "                  onPress={() => openPanel("
new += "panel === 'sticker' ? 'none' : 'sticker')}\n"
new += "                >\n"
new += "                  <Sticker size={20} color={"
new += "panel === 'sticker' ? C.primary : Colors.textMuted} />\n"
new += "                </TouchableOpacity>"

content = content.replace(old, new, 1)

with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
