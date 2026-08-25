with open('app/_layout.tsx', 'r') as f:
    content = f.read()

old = "export default function RootLayout() {"
new = "function DarkWrapper({ children }: { children: React.ReactNode }) {\n"
new += "  const C = useColors();\n"
new += "  return (\n"
new += "    <View style={{ flex: 1, backgroundColor: C.background }}>\n"
new += "      {children}\n"
new += "    </View>\n"
new += "  );\n"
new += "}\n\n"
new += "export default function RootLayout() {"

content = content.replace(old, new, 1)

old2 = "    <ThemeProvider>\n"
new2 = "    <ThemeProvider>\n      <DarkWrapper>\n"
content = content.replace(old2, new2, 1)

old3 = "    </ThemeProvider>"
new3 = "      </DarkWrapper>\n    </ThemeProvider>"
content = content.replace(old3, new3, 1)

with open('app/_layout.tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
