with open('app/(tabs)/settings.tsx', 'r') as f:
    content = f.read()

import re

pp_url = 'https://calvin20000.github.io/nexum/privacy.html'
terms_url = 'https://calvin20000.github.io/nexum/terms.html'

about = "        <Text style={styles.section}>NEXUMについて</Text>\n"
about += "        <View style={styles.card}>\n"
about += "          <TouchableOpacity style={styles.row}\n"
about += "            onPress={()=>require('expo-linking').openURL('"
about += pp_url
about += "')}>\n"
about += "            <View style={styles.rowLeft}>\n"
about += "              <View style={[styles.iconBox,{backgroundColor:'#E3F2FD'}]}>\n"
about += "                <Lock size={18} color='#1976D2' />\n"
about += "              </View>\n"
about += "              <Text style={styles.rowLabel}>プライバシーポリシー</Text>\n"
about += "            </View>\n"
about += "            <ChevronRight size={16} color='#9E9E9E' />\n"
about += "          </TouchableOpacity>\n"
about += "          <View style={styles.separator} />\n"
about += "          <TouchableOpacity style={styles.row}\n"
about += "            onPress={()=>require('expo-linking').openURL('"
about += terms_url
about += "')}>\n"
about += "            <View style={styles.rowLeft}>\n"
about += "              <View style={[styles.iconBox,{backgroundColor:'#E3F2FD'}]}>\n"
about += "                <Info size={18} color='#1976D2' />\n"
about += "              </View>\n"
about += "              <Text style={styles.rowLabel}>利用規約</Text>\n"
about += "            </View>\n"
about += "            <ChevronRight size={16} color='#9E9E9E' />\n"
about += "          </TouchableOpacity>\n"
about += "          <View style={styles.separator} />\n"
about += "          <View style={styles.row}>\n"
about += "            <View style={styles.rowLeft}>\n"
about += "              <View style={[styles.iconBox,{backgroundColor:'#E3F2FD'}]}>\n"
about += "                <Info size={18} color='#1976D2' />\n"
about += "              </View>\n"
about += "              <Text style={styles.rowLabel}>バージョン</Text>\n"
about += "            </View>\n"
about += "            <Text style={{color:'#9E9E9E',fontSize:14}}>1.0.0</Text>\n"
about += "          </View>\n"
about += "        </View>\n"
about += "        <View style={{backgroundColor:'#E3F2FD',borderRadius:12,padding:16,marginBottom:16}}>\n"
about += "          <Text style={{color:'#1976D2',fontWeight:'700',fontSize:14,marginBottom:4}}>\n"
about += "            プライバシーへの取り組み\n"
about += "          </Text>\n"
about += "          <Text style={{color:'#424242',fontSize:13,lineHeight:20}}>\n"
about += "            NEXUMは広告なし・データ収集なし・トラッキングなしで運営しています。\n"
about += "            あなたのデータは認証とチャット提供のみに使用され、\n"
about += "            第三者に提供されることは一切ありません。\n"
about += "          </Text>\n"
about += "        </View>\n"

old = "        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>"
content = content.replace(old, about + old, 1)

with open('app/(tabs)/settings.tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
