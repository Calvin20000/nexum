with open('lib/theme.tsx', 'r') as f:
    content = f.read()

old = "    await AsyncStorage.setItem(THEME_COLOR_KEY, color);\n  };"
new = "    await AsyncStorage.setItem(THEME_COLOR_KEY, color);\n  };\n"
new += "  const setIsDark = async (dark: boolean) => {\n"
new += "    setIsDarkState(dark);\n"
new += "    await AsyncStorage.setItem(DARK_MODE_KEY, dark ? 'true' : 'false');\n"
new += "  };"
content = content.replace(old, new, 1)

with open('lib/theme.tsx', 'w') as f:
    f.write(content)
print('STEP4 done')
