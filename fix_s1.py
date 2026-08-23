with open('app/chat/[id].tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = 0
for line in lines:
    if skip > 0:
        skip -= 1
        continue
    if "panel === 'sticker' && styles.toolBtnActive" in line:
        skip = 4
        continue
    new_lines.append(line)

with open('app/chat/[id].tsx', 'w') as f:
    f.writelines(new_lines)
print('SUCCESS')
