with open('lib/theme.tsx', 'r') as f:
    content = f.read()

old = "  primaryColor: string;\n  setPrimaryColor: (color: string) => void;\n};"
new = "  primaryColor: string;\n  setPrimaryColor: (color: string) => void;\n  isDark: boolean;\n  setIsDark: (dark: boolean) => void;\n};"
content = content.replace(old, new, 1)

old2 = "  primaryColor: DEFAULT_COLOR,\n  setPrimaryColor: () => {},\n});"
new2 = "  primaryColor: DEFAULT_COLOR,\n  setPrimaryColor: () => {},\n  isDark: false,\n  setIsDark: () => {},\n});"
content = content.replace(old2, new2, 1)

with open('lib/theme.tsx', 'w') as f:
    f.write(content)
print('STEP2 done')
