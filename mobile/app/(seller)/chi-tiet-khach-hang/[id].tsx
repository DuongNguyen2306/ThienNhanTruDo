/**
 * SCENE 026 — Lead Detail (Chi tiết khách hàng).
 *
 * IMPORTANT — the backend has NO `GET /api/seller/leads/:id` route
 * (see `backend/src/routes/seller.js`: only `GET /leads` and
 * `PUT /leads/:id`). This screen therefore loads the lead list and picks
 * the matching row. The list endpoint is scoped to `sellerId: req.user.id`
 * by the backend, so a lead id belonging to another seller is simply not
 * found — a seller cannot read another seller's lead this way.
 *
 * Status is written through `PUT /api/seller/leads/:id` with the backend's
 * status strings (new | contacted | interested | not_interested).
 *
 * There is NO note field in `model SellerLead`, so no note editor is
 * offered: the message the customer left is shown read-only.
 */

import { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Home, Mail, Phone } from 'lucide-react-native';

import { AppCard, ErrorState, LoadingState, StatusBadge } from '@/components/ui';
import { FilterChip } from '@/components/tenant';
import { useAsyncData } from '@/hooks/use-async-data';
import { sellerApi } from '@/lib/api-client';
import { formatDateTime, formatRelative } from '@/lib/format';
import {
  LEAD_STATUS_OPTIONS,
  dialablePhone,
  leadStatusLabel,
  leadStatusVariant,
} from '@/lib/seller-format';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { SellerLead } from '@/types/seller';

const LEADS_ROUTE = '/(seller)/(tabs)/khach-hang';

export default function LeadDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const leadId = typeof params.id === 'string' ? params.id : '';

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  /** The locally patched lead, so the UI reflects a successful PUT. */
  const [patched, setPatched] = useState<SellerLead | null>(null);

  const fetcher = useCallback(async () => {
    if (!leadId) throw new Error('Không tìm thấy khách hàng.');
    const response = await sellerApi.leads();
    const match = response.leads.find((item) => item.id === leadId);
    if (!match) throw new Error('Khách hàng không tồn tại hoặc không thuộc tài khoản của bạn.');
    return match;
  }, [leadId]);

  const { data, isLoading, error, reload } = useAsyncData<SellerLead>(fetcher, [leadId]);

  const lead = patched ?? data;

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(LEADS_ROUTE as never);
    }
  }, [router]);

  const call = useCallback(() => {
    const number = dialablePhone(lead?.phone);
    if (!number) return;
    // Opens the dialler with the number pre-filled — it never dials by
    // itself, the user still has to confirm.
    void Linking.openURL(`tel:${number}`);
  }, [lead?.phone]);

  const changeStatus = useCallback(
    async (status: string) => {
      if (busy || !lead) return;

      const previous = lead;
      setBusy(true);
      setActionError(null);
      setPatched({ ...lead, status });

      try {
        const result = await sellerApi.updateLead(lead.id, status);
        setPatched({ ...previous, ...result.lead });
      } catch (caught) {
        setPatched(previous);
        setActionError(
          caught instanceof Error
            ? caught.message
            : 'Không cập nhật được trạng thái. Vui lòng thử lại.',
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, lead],
  );

  const phoneNumber = useMemo(() => dialablePhone(lead?.phone), [lead?.phone]);

  if (!leadId) {
    return (
      <View style={styles.flex}>
        <Header onBack={goBack} title="Chi tiết khách hàng" topInset={insets.top} />
        <ErrorState
          title="Thiếu thông tin"
          message="Không xác định được khách hàng cần xem."
          onBack={goBack}
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <Header onBack={goBack} title="Chi tiết khách hàng" topInset={insets.top} />
        <LoadingState message="Đang tải khách hàng…" />
      </View>
    );
  }

  if (error || !lead) {
    return (
      <View style={styles.flex}>
        <Header onBack={goBack} title="Chi tiết khách hàng" topInset={insets.top} />
        <ErrorState
          title="Không tải được khách hàng"
          message={error ?? 'Khách hàng không tồn tại.'}
          onRetry={reload}
          onBack={goBack}
        />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Header
        onBack={goBack}
        title="Chi tiết khách hàng"
        subtitle={lead.listing?.title}
        topInset={insets.top}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* --- Identity ---------------------------------------------- */}
        <AppCard>
          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              <Text style={[styles.avatarText, { fontFamily: fontFamily.extrabold }]}>
                {initials(lead.name)}
              </Text>
            </View>

            <View style={styles.identityText}>
              <Text style={[styles.name, { fontFamily: fontFamily.extrabold }]}>{lead.name}</Text>
              <StatusBadge
                label={leadStatusLabel(lead.status)}
                variant={leadStatusVariant(lead.status)}
                withDot
                style={styles.identityBadge}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <InfoRow icon={Phone} label="Số điện thoại" value={lead.phone} />
          <InfoRow
            icon={Home}
            label="Tin đăng"
            value={lead.listing?.title ?? 'Tin đăng không còn tồn tại'}
          />
          <InfoRow icon={Mail} label="Gửi lúc" value={formatDateTime(lead.createdAt)} />
          <InfoRow label="Cập nhật" value={formatRelative(lead.updatedAt ?? lead.createdAt)} />
        </AppCard>

        {/* --- Message ----------------------------------------------- */}
        {lead.message ? (
          <AppCard style={styles.section}>
            <Text style={[styles.sectionLabel, { fontFamily: fontFamily.extrabold }]}>
              NỘI DUNG YÊU CẦU
            </Text>
            <Text style={[styles.message, { fontFamily: fontFamily.regular }]}>{lead.message}</Text>
          </AppCard>
        ) : null}

        {/* --- Contact ----------------------------------------------- */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { fontFamily: fontFamily.extrabold }]}>LIÊN HỆ</Text>

          {phoneNumber ? (
            <Pressable
              onPress={call}
              accessibilityRole="button"
              accessibilityLabel={`Gọi ${lead.phone}`}
              style={({ pressed }) => [styles.callButton, pressed ? styles.callPressed : null]}
            >
              <Phone size={18} color={colors.ink} strokeWidth={2.6} />
              <Text style={[styles.callLabel, { fontFamily: fontFamily.bold }]}>
                Gọi {lead.phone}
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.hint, { fontFamily: fontFamily.regular }]}>
              Số điện thoại không hợp lệ để gọi.
            </Text>
          )}
        </View>

        {/* --- Status ------------------------------------------------ */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { fontFamily: fontFamily.extrabold }]}>
            TRẠNG THÁI XỬ LÝ
          </Text>

          {actionError ? (
            <View style={styles.errorBanner}>
              <Text style={[styles.errorText, { fontFamily: fontFamily.medium }]}>
                {actionError}
              </Text>
            </View>
          ) : null}

          <View style={styles.statusChips}>
            {LEAD_STATUS_OPTIONS.map((option) => (
              <FilterChip
                key={option.key}
                label={option.label}
                selected={lead.status === option.key}
                onPress={() => {
                  if (busy || lead.status === option.key) return;
                  void changeStatus(option.key);
                }}
              />
            ))}
          </View>

          <Text style={[styles.hint, { fontFamily: fontFamily.regular }]}>
            {busy ? 'Đang lưu trạng thái…' : 'Chạm để cập nhật trạng thái xử lý khách hàng.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Header({
  onBack,
  title,
  subtitle,
  topInset,
}: {
  onBack: () => void;
  title: string;
  subtitle?: string;
  topInset: number;
}) {
  return (
    <View style={[styles.header, { paddingTop: topInset + spacing.md }]}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        hitSlop={10}
        style={styles.backButton}
      >
        <ArrowLeft size={20} color={colors.ink} strokeWidth={2.8} />
      </Pressable>

      <View style={styles.headerText}>
        <Text numberOfLines={1} style={[styles.headerTitle, { fontFamily: fontFamily.extrabold }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[styles.headerSubtitle, { fontFamily: fontFamily.regular }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      {Icon ? <Icon size={14} color={colors.textMuted} strokeWidth={2.5} /> : <View style={styles.infoDot} />}
      <Text style={[styles.infoLabel, { fontFamily: fontFamily.medium }]}>{label}</Text>
      <Text numberOfLines={2} style={[styles.infoValue, { fontFamily: fontFamily.semibold }]}>
        {value}
      </Text>
    </View>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
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
  headerTitle: {
    fontSize: fontSize.xl,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 1,
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
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  identityText: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.xl,
    color: colors.ink,
  },
  identityBadge: {
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderMuted,
    marginVertical: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  infoDot: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.textSubtle,
    marginHorizontal: 5,
  },
  infoLabel: {
    width: 96,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  infoValue: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.ink,
    textAlign: 'right',
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    color: colors.ink,
    letterSpacing: 0.4,
    marginBottom: spacing.md,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.ink,
    lineHeight: 22,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    ...shadow.sm,
  },
  callPressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    elevation: 0,
  },
  callLabel: {
    fontSize: fontSize.md,
    color: colors.ink,
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hint: {
    marginTop: spacing.md,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
  errorBanner: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
});
