with open('lib/theme.tsx', 'r') as f:
    content = f.read()

old = "  const { primaryColor } = useTheme();"
new = "  const { primaryColor, isDark } = useTheme();"
content = content.replace(old, new, 1)

old2 = "    textOnPrimary: isLight ? '#212121' : '#FFFFFF',\n  };"
new2 = "    textOnPrimary: isLight ? '#212121' : '#FFFFFF',\n"
new2 += "    isDark,\n"
new2 += "    background: isDark ? '#121212' : Colors.background,\n"
new2 += "    white: isDark ? '#1E1E1E' : '#FFFFFF',\n"
new2 += "    textPrimary: isDark ? '#FFFFFF' : Colors.textPrimary,\n"
new2 += "    textSecondary: isDark ? '#AAAAAA' : Colors.textSecondary,\n"
new2 += "    separator: isDark ? '#333333' : Colors.separator,\n"
new2 += "    bubbleOwn: isDark ? '#1976D2' : '#E3F2FD',\n"
new2 += "    bubbleOther: isDark ? '#2C2C2C' : '#FFFFFF',\n"
new2 += "    bubbleOwnText: '#000000',\n"
new2 += "    bubbleOtherText: isDark ? '#FFFFFF' : Colors.textPrimary,\n"
new2 += "  };"
content = content.replace(old2, new2, 1)

with open('lib/theme.tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
