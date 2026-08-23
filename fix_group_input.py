with open('app/group-chat/[id].tsx', 'r') as f:
    content = f.read()

new = "        <View style={styles.inputBar}>\n"
new += "          <TouchableOpacity style={styles.toolBtn} onPress={handlePickImage}>\n"
new += "            <Plus size={24} color={Colors.textMuted} />\n"
new += "          </TouchableOpacity>\n"
new += "          <View style={{\n"
new += "            flex:1, flexDirection:'row',\n"
new += "            alignItems:'flex-end',\n"
new += "            backgroundColor:Colors.white,\n"
new += "            borderRadius:22, borderWidth:1,\n"
new += "            borderColor:Colors.border, minHeight:38\n"
new += "          }}>\n"
new += "            <TextInput\n"
new += "              style={[styles.textInput,\n"
new += "                {flex:1, backgroundColor:'transparent', borderWidth:0}]}\n"
new += "              placeholder='メッセージを入力...'\n"
new += "              placeholderTextColor={Colors.textMuted}\n"
new += "              value={text}\n"
new += "              onChangeText={setText}\n"
new += "              multiline\n"
new += "              maxLength={2000}\n"
new += "              spellCheck={false}\n"
new += "              autoCorrect={false}\n"
new += "              onFocus={()=>{closePanel();scrollToBottom();}}\n"
new += "            />\n"
new += "            <TouchableOpacity style={{padding:8}}\n"
new += "              onPress={()=>openPanel(\n"
new += "                panel==='sticker'?'none':'sticker')}>\n"
new += "              <Sticker size={20}\n"
new += "                color={panel==='sticker'?C.primary:Colors.textMuted}/>\n"
new += "            </TouchableOpacity>\n"
new += "          </View>"

marker = "        <View style={styles.inputBar}>"
end_marker = "          </TouchableOpacity>"
idx = content.find(marker)
end_idx = content.find(end_marker, idx)
end_idx = content.find(end_marker, end_idx + 1)
end_idx = content.find(end_marker, end_idx + 1)
end_idx += len(end_marker)

content = content[:idx] + new + content[end_idx:]

with open('app/group-chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
