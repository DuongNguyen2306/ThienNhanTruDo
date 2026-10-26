/**
 * `LeadCard` — one interested customer (SCENE 025 / 026).
 *
 * A lead carries the contact details the tenant left on the listing form
 * (`SellerLead.name`, `.phone`, `.message`). Nothing else is shown: the
 * backend does not send an e-mail or an account id, so the card cannot
 * leak one.
 */

import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight, Home, Phone } from 'lucide-react-native';

import { StatusBadge } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { leadStatusLabel, leadStatusVariant } from '@/lib/seller-format';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { SellerLead } from '@/types/seller';

export interface LeadCardProps {
  lead: SellerLead;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function LeadCard({ lead, onPress, style }: LeadCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Khách ${lead.name}`}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null, style]}
    >
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={[styles.avatarText, { fontFamily: fontFamily.extrabold }]}>
            {initials(lead.name)}
          </Text>
        </View>

        <View style={styles.headerText}>
          <Text numberOfLines={1} style={[styles.name, { fontFamily: fontFamily.bold }]}>
            {lead.name}
          </Text>
          <Text style={[styles.time, { fontFamily: fontFamily.regular }]}>
            {formatRelative(lead.createdAt)}
          </Text>
        </View>

        <StatusBadge label={leadStatusLabel(lead.status)} variant={leadStatusVariant(lead.status)} withDot />
      </View>

      <View style={styles.row}>
        <Home size={13} color={colors.textMuted} strokeWidth={2.5} />
        <Text numberOfLines={1} style={[styles.metaText, { fontFamily: fontFamily.regular }]}>
          {lead.listing?.title ?? 'Tin đăng không còn tồn tại'}
        </Text>
      </View>

      <View style={styles.row}>
        <Phone size={13} color={colors.textMuted} strokeWidth={2.5} />
        <Text style={[styles.metaText, { fontFamily: fontFamily.regular }]}>{lead.phone}</Text>
        <ChevronRight size={16} color={colors.textMuted} strokeWidth={2.5} />
      </View>

      {lead.message ? (
        <Text numberOfLines={2} style={[styles.message, { fontFamily: fontFamily.regular }]}>
          {lead.message}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Up to two initials from a Vietnamese full name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadow.sm,
  },
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.md,
    color: colors.ink,
  },
  time: {
    marginTop: 1,
    fontSize: fontSize.xs,
    color: colors.textSubtle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  message: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
