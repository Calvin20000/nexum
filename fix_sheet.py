with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

new = "            <Text style={styles.sheetTitle}>送信</Text>\n"
new += "            <TouchableOpacity style={styles.sheetOption} onPress={() => { setShowPickerSheet(false); handlePickFile(); }}>\n"
new += "              <Paperclip size={22} color={C.primary} />\n"
new += "              <Text style={styles.sheetOptionText}>ファイルを送信</Text>\n"
new += "            </TouchableOpacity>\n"
new += "            <TouchableOpacity style={styles.sheetOption} onPress={() => setShowPickerSheet(false)}>\n"
new += "              <Text style={{ fontSize: 22 }}>location</Text>\n"
new += "              <Text style={styles.sheetOptionText}>位置情報を送信</Text>\n"
new += "            </TouchableOpacity>"

marker = "<Text style={styles.sheetTitle}>"
idx = content.find(marker)
end_marker = "ファイルを送信</Text>\n            </TouchableOpacity>"
end_idx = content.find(end_marker) + len(end_marker)

content = content[:idx] + new + content[end_idx:]

with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
