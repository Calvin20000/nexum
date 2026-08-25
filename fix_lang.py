with open('app/(tabs)/settings.tsx', 'r') as f:
    content = f.read()

lang_ui = "        <Text style={styles.section}>言語</Text>\n"
lang_ui += "        <View style={styles.card}>\n"
lang_ui += "          <TouchableOpacity style={styles.row} onPress={() => setShowLanguageModal(true)}>\n"
lang_ui += "            <View style={styles.rowLeft}>\n"
lang_ui += "              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>\n"
lang_ui += "                <ChevronRight size={18} color='#1976D2' />\n"
lang_ui += "              </View>\n"
lang_ui += "              <Text style={styles.rowLabel}>使用言語</Text>\n"
lang_ui += "            </View>\n"
lang_ui += "            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>\n"
lang_ui += "              <Text style={{ color: '#757575', fontSize: 14 }}>\n"
lang_ui += "                {LANGUAGE_OPTIONS.find(l => l.id === selectedLanguage)?.label}\n"
lang_ui += "              </Text>\n"
lang_ui += "              <ChevronRight size={16} color='#9E9E9E' />\n"
lang_ui += "            </View>\n"
lang_ui += "          </TouchableOpacity>\n"
lang_ui += "        </View>\n"

old = "        <Text style={styles.section}>テーマ</Text>"
new_code = lang_ui + old

content = content.replace(old, new_code, 1)

with open('app/(tabs)/settings.tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
