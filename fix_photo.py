with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

add = "\n            <TouchableOpacity style={styles.sheetOption} onPress={handlePickFromLibrary}>\n"
add += "              <ImageIcon size={22} color={C.primary} />\n"
add += "              <Text style={styles.sheetOptionText}>写真（複数）</Text>\n"
add += "            </TouchableOpacity>"

marker = "ライブラリから選択</Text>\n            </TouchableOpacity>"
content = content.replace(marker, marker + add, 1)

with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
