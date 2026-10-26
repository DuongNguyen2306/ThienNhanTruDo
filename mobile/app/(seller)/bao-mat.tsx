/**
 * SCENE 030 — Security (Bảo mật).
 *
 * HONESTY RULE: the backend supports exactly one of the items the design
 * suggests — changing the password (`PUT /api/auth/password`). Everything
 * else the mock-up implies (2FA, device list, login history, "sign out all
 * devices") has no endpoint and no data behind it, so it is listed as
 * *not supported* instead of as a switch that does nothing.
 *
 * The one extra item that IS real is the e-mail verification state from
 * `GET /api/auth/me` (`emailVerified`). That is shown read-only: the OTP
 * flow lives on the website, so the app does not pretend to run it.
 */

import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronRight,
  Info,
  KeyRound,
  Lock,
  Mail,
  ShieldAlert,
  Smartphone,
} from 'lucide-react-native';

import { AppCard, LoadingState, StatusBadge } from '@/components/ui';
import { useAsyncData } from '@/hooks/use-async-data';
import { authApi } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { ApiUser } from '@/types/auth';

const PASSWORD_ROUTE = '/(seller)/doi-mat-khau';
const ACCOUNT_ROUTE = '/(seller)/(tabs)/tai-khoan-chu-tro';

export default function SecurityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);

  const fetcher = useCallback(async () => {
    const result = await authApi.getMe();
    return result.user;
  }, []);

  const { data, isLoading, error, reload } = useAsyncData<ApiUser>(fetcher, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    reload();
    setRefreshing(false);
  }, [reload]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ACCOUNT_ROUTE as never);
    }
  }, [router]);

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={10}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={colors.ink} strokeWidth={2.8} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>BẢO MẬT</Text>
          <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
            Quản lý mật khẩu và trạng thái tài khoản
          </Text>
        </View>
      </View>

      {isLoading ? (
        <LoadingState message="Đang tải thông tin bảo mật…" />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />
          }
        >
          {error ? (
            <View style={styles.warnBanner}>
              <Info size={15} color={colors.warning} strokeWidth={2.5} />
              <Text style={[styles.warnText, { fontFamily: fontFamily.regular }]}>
                Không tải được trạng thái xác thực mới nhất. {error}
              </Text>
            </View>
          ) : null}

          {/* --- Account state --------------------------------------- */}
          <AppCard>
            <Text style={[styles.sectionLabel, { fontFamily: fontFamily.extrabold }]}>
              TRẠNG THÁI TÀI KHOẢN
            </Text>

            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Mail size={16} color={colors.ink} strokeWidth={2.6} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { fontFamily: fontFamily.semibold }]}>Email</Text>
                <Text numberOfLines={1} style={[styles.rowValue, { fontFamily: fontFamily.regular }]}>
                  {data?.email ?? user?.email ?? 'Chưa cập nhật'}
                </Text>
              </View>
              <StatusBadge
                label={data?.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                variant={data?.emailVerified ? 'verified' : 'pending'}
                withDot
              />
            </View>

            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Smartphone size={16} color={colors.ink} strokeWidth={2.6} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { fontFamily: fontFamily.semibold }]}>
                  Số điện thoại
                </Text>
                <Text style={[styles.rowValue, { fontFamily: fontFamily.regular }]}>
                  {data?.phone ?? user?.phone ?? '—'}
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Lock size={16} color={colors.ink} strokeWidth={2.6} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { fontFamily: fontFamily.semibold }]}>
                  Vai trò tài khoản
                </Text>
                <Text style={[styles.rowValue, { fontFamily: fontFamily.regular }]}>
                  Chủ cho thuê
                </Text>
              </View>
            </View>
          </AppCard>

          {/* --- Password -------------------------------------------- */}
          <Text style={[styles.sectionLabel, styles.sectionSpacing, { fontFamily: fontFamily.extrabold }]}>
            MẬT KHẨU
          </Text>

          <View style={styles.menu}>
            <Pressable
              onPress={() => router.push(PASSWORD_ROUTE as never)}
              accessibilityRole="button"
              accessibilityLabel="Đổi mật khẩu"
              style={({ pressed }) => [styles.menuRow, pressed ? styles.menuPressed : null]}
            >
              <View style={styles.menuIcon}>
                <KeyRound size={17} color={colors.ink} strokeWidth={2.6} />
              </View>
              <View style={styles.menuText}>
                <Text style={[styles.menuLabel, { fontFamily: fontFamily.semibold }]}>
                  Đổi mật khẩu
                </Text>
                <Text style={[styles.menuHint, { fontFamily: fontFamily.regular }]}>
                  Đổi mật khẩu sẽ đăng xuất các thiết bị khác
                </Text>
              </View>
              <ChevronRight size={17} color={colors.textMuted} strokeWidth={2.6} />
            </Pressable>
          </View>

          {/* --- Not supported --------------------------------------- */}
          <Text style={[styles.sectionLabel, styles.sectionSpacing, { fontFamily: fontFamily.extrabold }]}>
            CHƯA HỖ TRỢ
          </Text>

          <AppCard tone="background" flat>
            <View style={styles.unsupportedRow}>
              <ShieldAlert size={16} color={colors.textMuted} strokeWidth={2.5} />
              <Text style={[styles.unsupportedText, { fontFamily: fontFamily.regular }]}>
                Xác thực hai lớp (2FA)
              </Text>
            </View>
            <View style={styles.unsupportedRow}>
              <ShieldAlert size={16} color={colors.textMuted} strokeWidth={2.5} />
              <Text style={[styles.unsupportedText, { fontFamily: fontFamily.regular }]}>
                Danh sách thiết bị đang đăng nhập
              </Text>
            </View>
            <View style={styles.unsupportedRow}>
              <ShieldAlert size={16} color={colors.textMuted} strokeWidth={2.5} />
              <Text style={[styles.unsupportedText, { fontFamily: fontFamily.regular }]}>
                Lịch sử đăng nhập
              </Text>
            </View>

            <Text style={[styles.unsupportedHint, { fontFamily: fontFamily.regular }]}>
              Các tính năng này chưa có trên hệ thống nên chưa thể bật trong ứng dụng.
            </Text>
          </AppCard>

          {user?.id ? (
            <Text style={[styles.footerHint, { fontFamily: fontFamily.regular }]}>
              Tài khoản được bảo vệ bằng mật khẩu và phiên đăng nhập trên thiết bị này.
              {data?.emailVerified ? '' : ' Hãy xác thực email trên website để bảo mật hơn.'}
            </Text>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primary,
    borderBottomWidth: borderWidth.lg,
    borderBottomColor: colors.ink,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xl,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: colors.ink,
    opacity: 0.65,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.huge,
  },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.warning,
    backgroundColor: colors.warningSurface,
  },
  warnText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.ink,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    color: colors.ink,
    letterSpacing: 0.4,
    marginBottom: spacing.md,
  },
  sectionSpacing: {
    marginTop: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  rowValue: {
    marginTop: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  menu: {
    borderRadius: radius.lg,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadow.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  menuPressed: {
    backgroundColor: colors.background,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: fontSize.md,
    color: colors.ink,
  },
  menuHint: {
    marginTop: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  unsupportedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  unsupportedText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  unsupportedHint: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    lineHeight: 18,
  },
  footerHint: {
    marginTop: spacing.xl,
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    textAlign: 'center',
    lineHeight: 18,
  },
});
