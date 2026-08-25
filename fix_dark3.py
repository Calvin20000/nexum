with open('lib/theme.tsx', 'r') as f:
    content = f.read()

old = "  const [primaryColor, setPrimaryColorState] = useState(DEFAULT_COLOR);"
new = "  const [primaryColor, setPrimaryColorState] = useState(DEFAULT_COLOR);\n"
new += "  const [isDark, setIsDarkState] = useState(false);"
content = content.replace(old, new, 1)

old2 = "      if (color) setPrimaryColorState(color);\n    });\n  }, []);"
new2 = "      if (color) setPrimaryColorState(color);\n    });\n"
new2 += "    AsyncStorage.getItem(DARK_MODE_KEY).then((val) => {\n"
new2 += "      if (val !== null) setIsDarkState(val === 'true');\n"
new2 += "    });\n  }, []);"
content = content.replace(old2, new2, 1)

with open('lib/theme.tsx', 'w') as f:
    f.write(content)
print('STEP3 done')
