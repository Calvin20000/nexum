with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

old = "              <TouchableOpacity style={styles.toolBtn} onPress={() => setShowPickerSheet(true)}>\n"
old += "                <Plus size={24} color={Colors.textMuted} />\n"
old += "              </TouchableOpacity>\n"
old += "              \n"

new = "              {!isTyping ? (\n"
new += "                <>\n"
new += "                <TouchableOpacity style={styles.toolBtn}\n"
new += "                  onPress={()=>setShowPickerSheet(true)}>\n"
new += "                  <Plus size={24} color={Colors.textMuted}/>\n"
new += "                </TouchableOpacity>\n"

content = content.replace(old, new, 1)

with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
