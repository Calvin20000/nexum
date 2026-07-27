with open('app/group-chat/[id].tsx', 'r') as f:
    lines = f.readlines()

ins = [
    '      {pendingImage && (\n',
    '        <View style={{position:"absolute",top:0,left:0,right:0,bottom:0,backgroundColor:"rgba(0,0,0,0.8)",justifyContent:"center",alignItems:"center"}}>\n',
    '          <Image source={{uri:pendingImage.uri}} style={{width:300,height:300,borderRadius:12}} resizeMode="contain"/>\n',
    '          <TouchableOpacity onPress={()=>setPendingImage(null)}>\n',
    '            <Text style={{color:"white",marginTop:24}}>キャンセル</Text>\n',
    '          </TouchableOpacity>\n',
    '          <TouchableOpacity onPress={async()=>{const img=pendingImage;setPendingImage(null);await uploadAndSendImage(img.uri,img.mimeType);}}>\n',
    '            <Text style={{color:"white",marginTop:8}}>送信</Text>\n',
    '          </TouchableOpacity>\n',
    '        </View>\n',
    '      )}\n',
]

lines[457:457] = ins

with open('app/group-chat/[id].tsx', 'w') as f:
    f.writelines(lines)

print('SUCCESS')