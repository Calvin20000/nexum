with open('app/(tabs)/settings.tsx', 'r') as f:
    content = f.read()

modal = "      <Modal visible={showLanguageModal} transparent animationType='slide' onRequestClose={() => setShowLanguageModal(false)}>\n"
modal += "        <View style={styles.modalOverlay}>\n"
modal += "          <View style={styles.modalContent}>\n"
modal += "            <View style={styles.modalHeader}>\n"
modal += "              <Text style={styles.modalTitle}>言語を選択</Text>\n"
modal += "              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>\n"
modal += "                <X size={22} color={Colors.textSecondary} />\n"
modal += "              </TouchableOpacity>\n"
modal += "            </View>\n"
modal += "            {LANGUAGE_OPTIONS.map((lang) => (\n"
modal += "              <TouchableOpacity\n"
modal += "                key={lang.id}\n"
modal += "                style={styles.soundOption}\n"
modal += "                onPress={() => {\n"
modal += "                  setSelectedLanguage(lang.id);\n"
modal += "                  AsyncStorage.setItem(SELECTED_LANGUAGE_KEY, lang.id);\n"
modal += "                  setShowLanguageModal(false);\n"
modal += "                }}\n"
modal += "              >\n"
modal += "                <Text style={styles.soundOptionText}>{lang.label}</Text>\n"
modal += "                {selectedLanguage === lang.id && <Check size={18} color='#1976D2' />}\n"
modal += "              </TouchableOpacity>\n"
modal += "            ))}\n"
modal += "          </View>\n"
modal += "        </View>\n"
modal += "      </Modal>\n"

old = "    </SafeAreaView>\n  );\n}"
new_code = modal + "    </SafeAreaView>\n  );\n}"

content = content.replace(old, new_code, 1)

with open('app/(tabs)/settings.tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
