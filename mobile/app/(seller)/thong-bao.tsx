/**
 * SCENE 029 — Notifications (Thông báo).
 *
 * `GET /api/notifications` is scoped to `userId: req.user.id`, so this
 * screen only ever shows the signed-in account's notifications.
 *
 * Read state is written through the real endpoints
 * (`PUT /api/notifications/:id/read` and `PUT /api/notifications/read-all`);
 * the badge is cleared locally only after the server confirmed.
 *
 * `link` carries a WEBSITE path (e.g. `/tin-dang/abc`), not a mobile route.
 * Only the links that have a real mobile destination in this app are
 * followed; everything else shows the notification without navigating,
 * rather than pushing an unknown route.
 */

import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, BellOff, CheckCheck, Trash2 } from 'lucide-react-native';

import { AppButton, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { FilterChip } from '@/components/tenant';
import { useAsyncData } from '@/hooks/use-async-data';
import { notificationsApi } from '@/lib/api-client';
import { formatRelative } from '@/lib/format';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { AppNotification } from '@/types/seller';

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'unread', label: 'Chưa đọc' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

interface NotificationsPayload {
  notifications: AppNotification[];
  unreadCount: number;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetcher = useCallback(async (): Promise<NotificationsPayload> => {
    const response = await notificationsApi.list({ limit: 50 });
    return { notifications: response.notifications, unreadCount: response.unreadCount };
  }, []);

  const { data, isLoading, error, reload, setData } = useAsyncData<NotificationsPayload>(
    fetcher,
    [],
  );

  const notifications = useMemo(() => data?.notifications ?? [], [data]);
  const unreadCount = data?.unreadCount ?? 0;

  const visible = useMemo(
    () => (filter === 'unread' ? notifications.filter((item) => !item.read) : notifications),
    [filter, notifications],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    reload();
    setRefreshing(false);
  }, [reload]);

  const openNotification = useCallback(
    async (notification: AppNotification) => {
      // Mark as read first — the server is the authority.
      if (!notification.read && !busyId) {
        setBusyId(notification.id);
        try {
          await notificationsApi.markRead(notification.id);
          setData((current) => ({
            notifications: (current?.notifications ?? []).map((item) =>
              item.id === notification.id ? { ...item, read: true } : item,
            ),
            unreadCount: Math.max(0, (current?.unreadCount ?? 0) - 1),
          }));
        } catch (caught) {
          setActionError(
            caught instanceof Error ? caught.message : 'Không đánh dấu được thông báo đã đọc.',
          );
        } finally {
          setBusyId(null);
        }
      }

      const mobileRoute = mobileRouteForLink(notification.link);
      if (mobileRoute) {
        router.push(mobileRoute as never);
      }
    },
    [busyId, router, setData],
  );

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    setActionError(null);
    try {
      await notificationsApi.markAllRead();
      setData((current) => ({
        notifications: (current?.notifications ?? []).map((item) => ({ ...item, read: true })),
        unreadCount: 0,
      }));
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : 'Không đánh dấu được tất cả là đã đọc.',
      );
    }
  }, [setData, unreadCount]);

  const confirmDelete = useCallback(
    (notification: AppNotification) => {
      if (busyId) return;

      Alert.alert('Xóa thông báo', 'Bạn có chắc muốn xóa thông báo này?', [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setBusyId(notification.id);
            setActionError(null);
            try {
              await notificationsApi.remove(notification.id);
              setData((current) => ({
                notifications: (current?.notifications ?? []).filter(
                  (item) => item.id !== notification.id,
                ),
                unreadCount: notification.read
                  ? (current?.unreadCount ?? 0)
                  : Math.max(0, (current?.unreadCount ?? 0) - 1),
              }));
            } catch (caught) {
              setActionError(
                caught instanceof Error ? caught.message : 'Không xóa được thông báo.',
              );
            } finally {
              setBusyId(null);
            }
          },
        },
      ]);
    },
    [busyId, setData],
  );

  return (
    <View style={styles.flex}>
      {/* --- Header --------------------------------------------------- */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(seller)/(tabs)/tai-khoan-chu-tro' as never))}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={10}
            style={styles.backButton}
          >
            <ArrowLeft size={20} color={colors.ink} strokeWidth={2.8} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>THÔNG BÁO</Text>
            <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
              {isLoading
                ? 'Đang tải…'
                : unreadCount > 0
                  ? `${unreadCount} thông báo chưa đọc`
                  : 'Không có thông báo chưa đọc'}
            </Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((option) => (
            <FilterChip
              key={option.key}
              label={option.label}
              selected={filter === option.key}
              onPress={() => setFilter(option.key)}
            />
          ))}

          {unreadCount > 0 ? (
            <AppButton
              label="Đọc tất cả"
              size="sm"
              variant="secondary"
              onPress={markAllRead}
              trailingIcon={<CheckCheck size={14} color={colors.ink} strokeWidth={2.6} />}
            />
          ) : null}
        </View>
      </View>

      {actionError ? (
        <View style={styles.errorBanner}>
          <Text style={[styles.errorText, { fontFamily: fontFamily.medium }]}>{actionError}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <LoadingState message="Đang tải thông báo…" />
      ) : error ? (
        <ErrorState title="Không tải được thông báo" message={error} onRetry={reload} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
          description="Các cập nhật về tin đăng, lịch hẹn và tài khoản sẽ xuất hiện ở đây."
          icon={BellOff}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />
          }
        >
          {visible.map((notification) => (
            <Pressable
              key={notification.id}
              onPress={() => void openNotification(notification)}
              onLongPress={() => confirmDelete(notification)}
              accessibilityRole="button"
              accessibilityLabel={notification.title}
              style={({ pressed }) => [
                styles.card,
                !notification.read ? styles.cardUnread : null,
                pressed ? styles.cardPressed : null,
              ]}
            >
              <View style={styles.cardRow}>
                <View style={[styles.iconBox, !notification.read && styles.iconBoxUnread]}>
                  <Bell size={15} color={colors.ink} strokeWidth={2.6} />
                </View>

                <View style={styles.cardText}>
                  <Text
                    numberOfLines={2}
                    style={[styles.cardTitle, { fontFamily: notification.read ? fontFamily.semibold : fontFamily.bold }]}
                  >
                    {notification.title}
                  </Text>

                  {notification.body ? (
                    <Text
                      numberOfLines={3}
                      style={[styles.cardBody, { fontFamily: fontFamily.regular }]}
                    >
                      {notification.body}
                    </Text>
                  ) : null}

                  <Text style={[styles.cardTime, { fontFamily: fontFamily.regular }]}>
                    {formatRelative(notification.createdAt)}
                  </Text>
                </View>

                {!notification.read ? <View style={styles.unreadDot} /> : null}
              </View>

              <Pressable
                onPress={() => confirmDelete(notification)}
                accessibilityRole="button"
                accessibilityLabel="Xóa thông báo"
                hitSlop={8}
                style={styles.deleteButton}
              >
                <Trash2 size={13} color={colors.textMuted} strokeWidth={2.5} />
              </Pressable>
            </Pressable>
          ))}

          <Text style={[styles.footerHint, { fontFamily: fontFamily.regular }]}>
            Giữ một thông báo để xóa nhanh.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

/**
 * Map a website notification link onto a mobile route.
 *
 * Only the destinations that exist in this app are mapped; an unmapped
 * link returns `null` and the notification simply does not navigate.
 */
function mobileRouteForLink(link: string | null | undefined): string | null {
  if (!link) return null;

  if (link.startsWith('/tin-dang/')) {
    const id = link.slice('/tin-dang/'.length).split(/[/?#]/)[0];
    if (id) return `/(seller)/sua-tin/${id}`;
  }

  if (link.startsWith('/seller/listings')) return '/(seller)/(tabs)/tin-dang';
  if (link.startsWith('/tai-khoan/lich-hen')) return '/(seller)/(tabs)/lich-hen-xem';
  if (link.startsWith('/seller/billing')) return '/(seller)/(tabs)/tai-khoan-chu-tro';

  return null;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: borderWidth.lg,
    borderBottomColor: colors.ink,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xxl,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.ink,
    opacity: 0.65,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  errorBanner: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...shadow.sm,
  },
  cardUnread: {
    backgroundColor: '#FFFBEB',
  },
  cardPressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxUnread: {
    backgroundColor: colors.primary,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSize.md,
    color: colors.ink,
    lineHeight: 20,
  },
  cardBody: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 19,
  },
  cardTime: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.textSubtle,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    marginTop: spacing.xs,
  },
  deleteButton: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    padding: spacing.xs,
  },
  footerHint: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    textAlign: 'center',
  },
});
