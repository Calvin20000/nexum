import os

files = [
    'app/(tabs)/index.tsx',
    'app/(tabs)/friends.tsx',
    'app/(tabs)/settings.tsx',
    'app/(tabs)/profile.tsx',
    'app/chat/[id].tsx',
    'app/group-chat/[id].tsx',
]

for path in files:
    if not os.path.exists(path):
        print(f'SKIP: {path}')
        continue
    with open(path, 'r') as f:
        content = f.read()

    # SafeAreaViewにインラインスタイルを追加
    content = content.replace(
        '<SafeAreaView style={styles.safe}>',
        '<SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>'
    )
    # ヘッダーの背景色
    content = content.replace(
        'style={styles.header}>',
        'style={[styles.header, { backgroundColor: C.white, borderBottomColor: C.separator }]}>'
    )
    # カードの背景色
    content = content.replace(
        'style={styles.card}>',
        'style={[styles.card, { backgroundColor: C.white }]}>'
    )

    with open(path, 'w') as f:
        f.write(content)
    print(f'DONE: {path}')

