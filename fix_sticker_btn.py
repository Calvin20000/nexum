with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

# スタンプボタンをinputRowから削除
old_btn = "              <TouchableOpacity\n"
old_btn += "                style={[styles.toolBtn, panel === 'sticker' && styles.toolBtnActive]}\n"
old_btn += "                onPress={() => openPanel('sticker')}\n"
old_btn += "              >\n"
old_btn += "                <Sticker size={22} color={panel === 'sticker' ? C.primary : Colors.textMuted} />\n"
old_btn += "              </TouchableOpacity>\n"

content = content.replace(old_btn, '', 1)

# TextInputをViewでラップしてスタンプボタンを右端に追加
old_input = "              <TextInput\n"
old_input += "                ref={inputRef}\n"
old_input += "                style={styles.textInput}\n"
old_input += "                placeholder=\"メッセージを入力...\"\n"
old_input += "                placeholderTextColor={Colors.textMuted}\n"
old_input += "                value={text}\n"
old_input += "                onChangeText={handleTextChange}\n"
old_input += "                multiline\n"
old_input += "                maxLength={2000}\n"
old_input += "                spellCheck={false}\n"
old_input += "                autoCorrect={false}\n"
old_input += "                onFocus={() => {\n"
old_input += "                  closePanel();\n"
old_input += "                  scrollToBottom();\n"
old_input += "                }}\n"
old_input += "              />"

new_input = "              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: Colors.inputBackground, 
borderRadius: 22, borderWidth: 1, borderColor: Colors.border }}>\n"
new_input += "                <TextInput\n"
new_input += "                  ref={inputRef}\n"
new_input += "                  style={[styles.textInput, { flex: 1, backgroundColor: 'transparent', borderWidth: 0 }]}\n"
new_input += "                  placeholder=\"メッセージを入力...\"\n"
new_input += "                  placeholderTextColor={Colors.textMuted}\n"
new_input += "                  value={text}\n"
new_input += "                  onChangeText={handleTextChange}\n"
new_input += "                  multiline\n"
new_input += "                  maxLength={2000}\n"
new_input += "                  spellCheck={false}\n"
new_input += "                  autoCorrect={false}\n"
new_input += "                  onFocus={() => {\n"
new_input += "                    closePanel();\n"
new_input += "                    scrollToBottom();\n"
new_input += "                  }}\n"
new_input += "                />\n"
new_input += "                <TouchableOpacity style={{ padding: 8 }} onPress={() => openPanel(panel === 'sticker' ? 'none' : 'sticker')}>\n"
new_input += "                  <Sticker size={20} color={panel === 'sticker' ? Colors.primary : Colors.textMuted} />\n"
new_input += "                </TouchableOpacity>\n"
new_input += "              </View>"

if old_input in content:
    content = content.replace(old_input, new_input, 1)
    with open('app/chat/[id].tsx', 'w') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('NOT FOUND')
