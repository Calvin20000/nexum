import os

files = [
    'app/(tabs)/index.tsx',
    'app/(tabs)/friends.tsx',
    'app/(tabs)/settings.tsx',
    'app/(tabs)/profile.tsx',
]

for path in files:
    if not os.path.exists(path):
        continue
    with open(path, 'r') as f:
        content = f.read()

    content = content.replace(
        'style={styles.headerTitle}',
        'style={[styles.headerTitle, { color: C.textPrimary }]}'
    )
    content = content.replace(
        'style={styles.rowLabel}',
        'style={[styles.rowLabel, { color: C.textPrimary }]}'
    )

    with open(path, 'w') as f:
        f.write(content)
    print(f'DONE: {path}')
