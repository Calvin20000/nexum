with open('app/(tabs)/settings.tsx', 'r') as f:
    content = f.read()

old = "        <Text style={styles.section}>テーマ</Text>"

new = "        <Text style={styles.section}>着せ替え</Text>\n"
new += "        <View style={styles.card}>\n"
new += "          <View style={styles.row}>\n"
new += "            <View style={styles.rowLeft}>\n"
new += "              <View style={[styles.iconBox, { backgroundColor: '#212121' }]}>\n"
new += "                <Palette size={18} color='#FFFFFF' />\n"
new += "              </View>\n"
new += "              <Text style={styles.rowLabel}>ダークモード</Text>\n"
new += "            </View>\n"
new += "            <Switch\n"
new += "              value={isDarkMode}\n"
new += "              onValueChange={(val) => {\n"
new += "                setIsDarkMode(val);\n"
new += "                setIsDark(val);\n"
new += "              }}\n"
new += "              trackColor={{ false: '#E0E0E0', true: '#1976D2' }}\n"
new += "              thumbColor='#FFFFFF'\n"
new += "            />\n"
new += "          </View>\n"
new += "        </View>\n"
new += "        <Text style={styles.section}>テーマ</Text>"

content = content.replace(old, new, 1)

with open('app/(tabs)/settings.tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
