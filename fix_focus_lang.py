with open('app/(tabs)/settings.tsx', 'r') as f:
    content = f.read()

old = "import { router } from 'expo-router';"
new = "import { router, useFocusEffect } from 'expo-router';"
content = content.replace(old, new, 1)

old2 = "import { Bell, Lock"
new2 = "import { useCallback } from 'react';\nimport { Bell, Lock"
content = content.replace(old2, new2, 1)

old3 = "  const [showLanguageModal, setShowLanguageModal] = React.useState(false);"
new3 = "  const [showLanguageModal, setShowLanguageModal] = React.useState(false);\n"
new3 += "  useFocusEffect(\n"
new3 += "    useCallback(() => {\n"
new3 += "      AsyncStorage.getItem(SELECTED_LANGUAGE_KEY).then((val) => {\n"
new3 += "        if (val !== null) setSelectedLanguage(val as LanguageId);\n"
new3 += "      });\n"
new3 += "    }, [])\n"
new3 += "  );"
content = content.replace(old3, new3, 1)

with open('app/(tabs)/settings.tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
