with open('app/group-chat/[id].tsx', 'r') as f:
    content = f.read()

old = "          <TouchableOpacity style={styles.toolBtn} onPress={() => setShowPickerSheet(true)}>\n"
old += "            <Plus size={24} color={Colors.textMuted} />\n"
old += "          </TouchableOpacity>\n"
old += "          <TouchableOpacity style={styles.toolBtn} onPress={handlePickImageCamera}>\n"
old += "            <Camera size={22} color={Colors.textMuted} />\n"
old += "          </TouchableOpacity>\n"
old += "          <TouchableOpacity style={styles.toolBtn} onPress={handlePickImage}>\n"
old += "            <ImageIcon size={22} color={Colors.textMuted} />\n"
old += "          </TouchableOpacity>"

new = "          {!isTyping ? (\n"
new += "            <>\n"
new += "            <TouchableOpacity style={styles.toolBtn}\n"
new += "              onPress={()=>setShowPickerSheet(true)}>\n"
new += "              <Plus size={24} color={Colors.textMuted}/>\n"
new += "            </TouchableOpacity>\n"
new += "            <TouchableOpacity style={styles.toolBtn}\n"
new += "              onPress={handlePickImageCamera}>\n"
new += "              <Camera size={22} color={Colors.textMuted}/>\n"
new += "            </TouchableOpacity>\n"
new += "            <TouchableOpacity style={styles.toolBtn}\n"
new += "              onPress={handlePickImage}>\n"
new += "              <ImageIcon size={22} color={Colors.textMuted}/>\n"
new += "            </TouchableOpacity>\n"
new += "            </>\n"
new += "          ) : (\n"
new += "            <TouchableOpacity style={styles.toolBtn}\n"
new += "              onPress={()=>setIsTyping(false)}>\n"
new += "              <ChevronRight size={24} color={Colors.textMuted}/>\n"
new += "            </TouchableOpacity>\n"
new += "          )}"

if old in content:
    content = content.replace(old, new, 1)
    with open('app/group-chat/[id].tsx', 'w') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('NOT FOUND')
