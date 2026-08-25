with open('lib/i18n/translations.ts', 'r') as f:
    content = f.read()

old = "    editProfile: 'プロフィールを編集',\n  },"
new = "    editProfile: 'プロフィールを編集',\n"
new += "    notifications: '通知',\n"
new += "    sound: 'サウンド',\n"
new += "    vibration: 'バイブレーション',\n"
new += "    preview: 'メッセージプレビュー',\n"
new += "    appearance: '着せ替え',\n"
new += "    darkMode: 'ダークモード',\n"
new += "    themeColor: 'テーマカラー',\n"
new += "    about: 'NEXUMについて',\n"
new += "    privacy: 'プライバシーポリシー',\n"
new += "    terms: '利用規約',\n"
new += "    version: 'バージョン',\n"
new += "    logout: 'ログアウト',\n"
new += "  },"
content = content.replace(old, new, 1)

old2 = "    editProfile: 'Edit Profile',\n  },"
new2 = "    editProfile: 'Edit Profile',\n"
new2 += "    notifications: 'Notifications',\n"
new2 += "    sound: 'Sound',\n"
new2 += "    vibration: 'Vibration',\n"
new2 += "    preview: 'Message Preview',\n"
new2 += "    appearance: 'Appearance',\n"
new2 += "    darkMode: 'Dark Mode',\n"
new2 += "    themeColor: 'Theme Color',\n"
new2 += "    about: 'About NEXUM',\n"
new2 += "    privacy: 'Privacy Policy',\n"
new2 += "    terms: 'Terms of Service',\n"
new2 += "    version: 'Version',\n"
new2 += "    logout: 'Logout',\n"
new2 += "  },"
content = content.replace(old2, new2, 1)

old3 = "    editProfile: '编辑个人资料',\n  },"
new3 = "    editProfile: '编辑个人资料',\n"
new3 += "    notifications: '通知',\n"
new3 += "    sound: '声音',\n"
new3 += "    vibration: '振动',\n"
new3 += "    preview: '消息预览',\n"
new3 += "    appearance: '外观',\n"
new3 += "    darkMode: '深色模式',\n"
new3 += "    themeColor: '主题颜色',\n"
new3 += "    about: '关于NEXUM',\n"
new3 += "    privacy: '隐私政策',\n"
new3 += "    terms: '服务条款',\n"
new3 += "    version: '版本',\n"
new3 += "    logout: '退出',\n"
new3 += "  },"
content = content.replace(old3, new3, 1)

old4 = "    editProfile: '編輯個人資料',\n  },"
new4 = "    editProfile: '編輯個人資料',\n"
new4 += "    notifications: '通知',\n"
new4 += "    sound: '聲音',\n"
new4 += "    vibration: '振動',\n"
new4 += "    preview: '訊息預覽',\n"
new4 += "    appearance: '外觀',\n"
new4 += "    darkMode: '深色模式',\n"
new4 += "    themeColor: '主題顏色',\n"
new4 += "    about: '關於NEXUM',\n"
new4 += "    privacy: '隱私政策',\n"
new4 += "    terms: '服務條款',\n"
new4 += "    version: '版本',\n"
new4 += "    logout: '登出',\n"
new4 += "  },"
content = content.replace(old4, new4, 1)

with open('lib/i18n/translations.ts', 'w') as f:
    f.write(content)
print('SUCCESS')
