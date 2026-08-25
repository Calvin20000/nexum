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
    content = content.replace(
        'backgroundColor: C.background',
        'backgroundColor: Colors.background'
    )
    content = content.replace(
        'backgroundColor: C.white',
        'backgroundColor: Colors.white'
    )
    with open(path, 'w') as f:
        f.write(content)
    print(f'DONE: {path}')
