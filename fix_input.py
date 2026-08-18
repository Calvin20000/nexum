with open('app/group-chat/[id].tsx', 'r') as f:
    content = f.read()

old = '''        <View style={styles.inputBar}>
          <TouchableOpacity
            style={[styles.toolBtn, panel === 'sticker' && styles.toolBtnActive]}
            onPress={() => openPanel('sticker')}
          >
            <Sticker size={22} color={panel === 'sticker' ? C.primary : Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolBtn, panel === 'emoji' && styles.toolBtnActive]}
            onPress={() => openPanel('emoji')}
          >
            <Smile size={22} color={panel === 'emoji' ? C.primary : Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={handlePickImage}
            disabled={sending}
          >
            <ImageIcon size={22} color={Colors.textMuted} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="メッセージを入力..."
            placeholderTextColor={Colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            spellCheck={false}
            autoCorrect={false}
            onFocus={() => { closePanel(); scrollToBottom(); }}
          />'''

new = '''        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.toolBtn} onPress={handlePickImage}>
            <Plus size={24} color={Colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.textInputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="メッセージを入力..."
              placeholderTextColor={Colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
              spellCheck={false}
              autoCorrect={false}
              onFocus={() => { closePanel(); scrollToBottom(); }}
            />
            <TouchableOpacity style={styles.emojiBtn} onPress={() => openPanel(panel === 'emoji' ? 'none' : 'emoji')}>
              <Smile size={20} color={panel === 'emoji' ? C.primary : Colors.textMuted} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.toolBtn, panel === 'sticker' && styles.toolBtnActive]} onPress={() => openPanel(panel === 'sticker' ? 
'none' : 'sticker')}>
            <Sticker size={22} color={panel === 'sticker' ? C.primary : Colors.textMuted} />
          </TouchableOpacity>'''

if old in content:
    content = content.replace(old, new, 1)
    with open('app/group-chat/[id].tsx', 'w') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('ERROR')
