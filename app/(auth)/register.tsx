import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Mail, Lock, User, Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/lib/colors';

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // When email confirmation is required, show a holding screen
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const handleRegister = async () => {
    if (!displayName.trim()) {
      setError('表示名を入力してください');
      return;
    }
    if (!email.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }
    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signUpError) {
      setLoading(false);
      if (signUpError.message.includes('already registered')) {
        setError('このメールアドレスは既に使用されています');
      } else {
        setError('登録に失敗しました。もう一度お試しください');
      }
      return;
    }

    if (data.user) {
      await supabase
        .from('users')
        .update({ display_name: displayName.trim() })
        .eq('id', data.user.id);
    }

    setLoading(false);

    // If no session, email confirmation is required
    if (!data.session) {
      setAwaitingConfirmation(true);
    }
    // If session exists, _layout.tsx onAuthStateChange handles navigation automatically
  };

  if (awaitingConfirmation) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.confirmContainer}>
          <CheckCircle size={64} color={Colors.primary} />
          <Text style={styles.confirmTitle}>メールを確認してください</Text>
          <Text style={styles.confirmBody}>
            <Text style={styles.confirmEmail}>{email.trim().toLowerCase()}</Text>
            {'\n\n'}に確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してください。
          </Text>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>ログインへ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAwaitingConfirmation(false)}
            style={styles.backLink}
          >
            <Text style={styles.footerLink}>戻る</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <ChevronLeft size={24} color={Colors.primary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>アカウント作成</Text>
            <Text style={styles.subtitle}>NEXUMに参加しましょう</Text>
          </View>

          <View style={styles.form}>
            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>表示名</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="あなたの名前"
                  placeholderTextColor={Colors.textMuted}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>メールアドレス</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>パスワード</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="6文字以上"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  {showPassword
                    ? <EyeOff size={18} color={Colors.textMuted} />
                    : <Eye size={18} color={Colors.textMuted} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>パスワード（確認）</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="パスワードを再入力"
                  placeholderTextColor={Colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.submitBtnText}>アカウントを作成</Text>}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>既にアカウントをお持ちの方は </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.footerLink}>ログイン</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  back: { marginTop: 16, marginBottom: 8, width: 40, height: 40, justifyContent: 'center' },
  header: { marginBottom: 32, gap: 6 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.primary },
  subtitle: { fontSize: 16, color: Colors.textSecondary },
  form: { gap: 20 },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  errorText: { color: Colors.error, fontSize: 13 },
  inputGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  inputFlex: { flex: 1 },
  eyeBtn: { padding: 4 },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  footerText: { fontSize: 14, color: Colors.textSecondary },
  footerLink: { fontSize: 14, color: Colors.primary, fontWeight: '700' },

  // Email confirmation screen
  confirmContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  confirmBody: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  confirmEmail: {
    fontWeight: '700',
    color: Colors.primary,
  },
  backLink: { marginTop: 8 },
});
