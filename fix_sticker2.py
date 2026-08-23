with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

a = "                }}\n"
a += "              />"
b = "                }}\n"
b += "              />\n"
b += "              <TouchableOpacity\n"
b += "                style={{padding:8}}\n"
b += "                onPress={()=>openPanel(\n"
b += "                  panel==='sticker'?'none':'sticker'\n"
b += "                )}\n"
b += "              >\n"
b += "                <Sticker size={20}\n"
b += "                  color={panel==='sticker'\n"
b += "                    ?C.primary:Colors.textMuted}\n"
b += "                />\n"
b += "              </TouchableOpacity>"
content = content.replace(a, b, 1)
with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
print('STEP2 done')
