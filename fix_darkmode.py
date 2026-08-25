with open('lib/theme.tsx', 'r') as f:
    content = f.read()

old = "const THEME_COLOR_KEY = 'theme_color';"
new_code = "const THEME_COLOR_KEY = 'theme_color';\nconst DARK_MODE_KEY = 'dark_mode';"

content = content.replace(old, new_code, 1)

old2 = "type ThemeContextType = {\n  primaryColor: string;\n  setPrimaryColor: (color: string) => void;\n};"
new_code2 = "type ThemeContextType = {\n  primaryColor: string;\n  setPrimaryColor: (color: string) => void;\n  isDark: boolean;\n  setIsDark: 
(dark: boolean) => void;\n};"

content = content.replace(old2, new_code2, 1)

old3 = "export const ThemeContext = createContext<ThemeContextType>({\n  primaryColor: DEFAULT_COLOR,\n  setPrimaryColor: () => {},\n});"
new_code3 = "export const ThemeContext = createContext<ThemeContextType>({\n  primaryColor: DEFAULT_COLOR,\n  setPrimaryColor: () => {},\n  
isDark: false,\n  setIsDark: () => {},\n});"

content = content.replace(old3, new_code3, 1)

old4 = "  const [primaryColor, setPrimaryColorState] = useState(DEFAULT_COLOR);\n  useEffect(() => {\n    
AsyncStorage.getItem(THEME_COLOR_KEY).then((color) => {\n      if (color) setPrimaryColorState(color);\n    });\n  }, []);"
new_code4 = "  const [primaryColor, setPrimaryColorState] = useState(DEFAULT_COLOR);\n  const [isDark, setIsDarkState] = useState(false);\n  
useEffect(() => {\n    AsyncStorage.getItem(THEME_COLOR_KEY).then((color) => {\n      if (color) setPrimaryColorState(color);\n    });\n    
AsyncStorage.getItem(DARK_MODE_KEY).then((val) => {\n      if (val !== null) setIsDarkState(val === 'true');\n    });\n  }, []);"

content = content.replace(old4, new_code4, 1)

old5 = "  const setPrimaryColor = async (color: string) => {\n    setPrimaryColorState(color);\n    await AsyncStorage.setItem(THEME_COLOR_KEY, 
color);\n  };"
new_code5 = "  const setPrimaryColor = async (color: string) => {\n    setPrimaryColorState(color);\n    await 
AsyncStorage.setItem(THEME_COLOR_KEY, color);\n  };\n  const setIsDark = async (dark: boolean) => {\n    setIsDarkState(dark);\n    await 
AsyncStorage.setItem(DARK_MODE_KEY, dark ? 'true' : 'false');\n  };"

content = content.replace(old5, new_code5, 1)

with open('lib/theme.tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
