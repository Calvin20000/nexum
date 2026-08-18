with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

old = "onPress={handleImageButtonPress}>\n"
old += "                <Camera size={22} color={Colors.textMuted} />\n"
old += "              </TouchableOpacity>\n"
old += "              <Touch"

new = "onPress={handleImageButtonPress}>\n"
new += "                <Camera size={22} color={Colors.textMuted} />\n"
new += "              </TouchableOpacity>\n"
new += "              <TouchableOpacity style={styles.toolBtn} onPress={handlePickFromLibrary}>\n"
new += "                <ImageIcon size={22} color={Colors.textMuted} />\n"
new += "              </TouchableOpacity>\n"
new += "              <Touch"

content = content.replace(old, new, 1)

with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
