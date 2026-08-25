with open('app/(tabs)/settings.tsx', 'r') as f:
    content = f.read()

replacements = [
    (">通知</Text>", ">{t('notifications')}</Text>"),
    (">テーマ</Text>", ">{t('theme')}</Text>"),
    (">着せ替え</Text>", ">{t('appearance')}</Text>"),
    (">言語</Text>", ">{t('language')}</Text>"),
    (">NEXUMについて</Text>", ">{t('about')}</Text>"),
    (">ダークモード</Text>", ">{t('darkMode')}</Text>"),
    (">テーマカラー</Text>", ">{t('themeColor')}</Text>"),
    (">プライバシーポリシー</Text>", ">{t('privacy')}</Text>"),
    (">利用規約</Text>", ">{t('terms')}</Text>"),
    (">バージョン</Text>", ">{t('version')}</Text>"),
    (">ログアウト</Text>", ">{t('logout')}</Text>"),
]

for old, new in replacements:
    content = content.replace(old, new)

with open('app/(tabs)/settings.tsx', 'w') as f:
    f.write(content)
print('SUCCESS')
