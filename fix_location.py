with open('app/chat/[id].tsx', 'r') as f:
    content = f.read()

handler = "  const handleSendLocation = async () => {\n"
handler += "    setShowPickerSheet(false);\n"
handler += "    const { status } = await Location.requestForegroundPermissionsAsync();\n"
handler += "    if (status !== 'granted') {\n"
handler += "      Alert.alert('error', 'location permission denied');\n"
handler += "      return;\n"
handler += "    }\n"
handler += "    const loc = await Location.getCurrentPositionAsync({});\n"
handler += "    const url = 'https://maps.google.com/?q=' + loc.coords.latitude + ',' + loc.coords.longitude;\n"
handler += "    const msg = 'location: ' + url;\n"
handler += "    setText(msg);\n"
handler += "  };\n\n"

old = "  const handlePickFile = async () => {"
new = handler + old

content = content.replace(old, new, 1)

with open('app/chat/[id].tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
