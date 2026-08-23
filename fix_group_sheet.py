with open('app/group-chat/[id].tsx', 'r') as f:
    content = f.read()

s = "      {showPickerSheet && (\n"
s += "        <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,\n"
s += "          backgroundColor:'rgba(0,0,0,0.5)'}}>\n"
s += "          <TouchableOpacity style={{flex:1}}\n"
s += "            onPress={()=>setShowPickerSheet(false)}/>\n"
s += "          <View style={{backgroundColor:'white',\n"
s += "            borderTopLeftRadius:16,borderTopRightRadius:16,padding:16}}>\n"
s += "            <Text style={{fontSize:16,fontWeight:'700',marginBottom:16}}>\n"
s += "              送信\n"
s += "            </Text>\n"
s += "            <TouchableOpacity\n"
s += "              style={{flexDirection:'row',alignItems:'center',gap:12,padding:12}}\n"
s += "              onPress={()=>{setShowPickerSheet(false);handlePickFile();}}>\n"
s += "              <Paperclip size={22} color='#1976D2'/>\n"
s += "              <Text>ファイルを送信</Text>\n"
s += "            </TouchableOpacity>\n"
s += "            <TouchableOpacity\n"
s += "              style={{flexDirection:'row',alignItems:'center',gap:12,padding:12}}\n"
s += "              onPress={()=>setShowPickerSheet(false)}>\n"
s += "              <Text style={{fontSize:22}}>location</Text>\n"
s += "              <Text>位置情報を送信</Text>\n"
s += "            </TouchableOpacity>\n"
s += "            <TouchableOpacity\n"
s += "              style={{padding:12,alignItems:'center'}}\n"
s += "              onPress={()=>setShowPickerSheet(false)}>\n"
s += "              <Text style={{color:'red'}}>キャンセル</Text>\n"
s += "            </TouchableOpacity>\n"
s += "          </View>\n"
s += "        </View>\n"
s += "      )}\n"

old = "      {pendingImage && ("
content = content.replace(old, s + old, 1)

with open('app/group-chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
