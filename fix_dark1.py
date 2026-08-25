with open('lib/theme.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "const THEME_COLOR_KEY = 'theme_color';",
    "const THEME_COLOR_KEY = 'theme_color';\nconst DARK_MODE_KEY = 'dark_mode';"
, 1)

content = content.replace(
    "  isDark: false,\n  setIsDark: () => {},",
    "  isDark: false,\n  setIsDark: () => {},"
, 1) if False else content

with open('lib/theme.tsx', 'w') as f:
    f.write(content)
print('STEP1 done')
