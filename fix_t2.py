with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

old = "              <TouchableOpacity style={styles.toolBtn} onPress={handlePickFromCamera}>\n"
old += "                <Camera size={22} color={Colors.textMuted} />\n"
old += "              </TouchableOpacity>\n"
old += "              <TouchableOpacity style={styles.toolBtn} onPress={handlePickFromLibrary}>\n"
old += "                <ImageIcon size={22} color={Colors.textMuted} />\n"
old += "              </TouchableOpacity>"

new = "                <TouchableOpacity style={styles.toolBtn}\n"
new += "                  onPress={handlePickFromCamera}>\n"
new += "                  <Camera size={22} color={Colors.textMuted}/>\n"
new += "                </TouchableOpacity>\n"
new += "                <TouchableOpacity style={styles.toolBtn}\n"
new += "                  onPress={handlePickFromLibrary}>\n"
new += "                  <ImageIcon size={22} color={Colors.textMuted}/>\n"
new += "                </TouchableOpacity>\n"
new += "                </>\n"
new += "              ) : (\n"
new += "                <TouchableOpacity style={styles.toolBtn}\n"
new += "                  onPress={()=>setIsTyping(false)}>\n"
new += "                  <ChevronRight size={24} color={Colors.textMuted}/>\n"
new += "                </TouchableOpacity>\n"
new += "              )}"

content = content.replace(old, new, 1)

with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
