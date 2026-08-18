with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

old = "            <View style={styles.inputRow}>"

new = "            <View style={styles.inputRow}>\n"
new += "              <TouchableOpacity style={styles.toolBtn} onPress={() => setShowPickerSheet(true)}>\n"
new += "                <Plus size={24} color={Colors.textMuted} />\n"
new += "              </TouchableOpacity>"

content = content.replace(old, new, 1)

with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
