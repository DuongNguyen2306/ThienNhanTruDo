/**
 * SCENE 010 — Map search.
 *
 * The map view of the search results. The rooms are plotted on a real map
 * (`react-native-maps`, which is already a dependency) and the list below
 * shows the same rooms.
 *
 * The data comes from `GET /api/listings`, exactly like the list screen
 * (SCENE 009) — the map is only another way to look at the same rooms.
 * A room without coordinates is still listed, but it cannot be plotted.
 *
 * BUG-02 additions:
 *   - tapping a marker selects exactly that room (by its real id) and
 *     scrolls the horizontal list to the matching card;
 *   - the selected room gets a preview card (photo, title, rent, short
 *     address) with two actions: "Xem chi tiết" (SCENE 011) and
 *     "Chỉ đường" (the device map app);
 *   - every card also has a "Xem chi tiết" action of its own;
 *   - "Chỉ đường" hands the real coordinate to Apple Maps (iOS) or
 *     Google Maps (Android). Distance and travel time are computed by that
 *     app, never by us — no Haversine, no fake ETA, no Directions API.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, type Region } from 'react-native-maps';
import { Home, MapPin, Navigation } from 'lucide-react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { listingsApi } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/use-async-data';
import { formatRent, formatShortAddress } from '@/lib/format';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { Listing } from '@/types/listing';

/** The room detail screen (SCENE 011). It reads the `id` route param. */
const DETAIL_ROUTE = '/(tenant)/chi-tiet-phong';

/** The initial region — Ho Chi Minh City, the service area of the app. */
const INITIAL_REGION: Region = {
  latitude: 10.7769,
  longitude: 106.7009,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

/** The width of a room card in the horizontal list (see `styles.card`). */
const CARD_WIDTH = 190;

/**
 * A coordinate is only usable when both parts are finite numbers inside the
 * legal range. Anything else (missing, null, NaN, out of range) is refused —
 * we never fall back to a made-up position.
 */
function hasValidCoordinate(listing: Listing): boolean {
  const { lat, lng } = listing;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/** Build the device-map URL that opens turn-by-turn directions to the room. */
function buildDirectionsUrl(listing: Listing): string | null {
  if (!hasValidCoordinate(listing)) return null;

  const lat = listing.lat as number;
  const lng = listing.lng as number;

  if (Platform.OS === 'ios') {
    // Apple Maps, driving directions to the destination coordinate.
    return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
  }

  // Android (and anything else that can handle a Google Maps link).
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${lat},${lng}`,
  )}&travelmode=driving`;
}

export default function MapSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const rowRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetcher = useCallback(() => listingsApi.search({ limit: 50, sortBy: 'createdAt' }), []);
  const { data, isLoading, error, reload } = useAsyncData(fetcher, []);

  const listings = useMemo(() => data?.listings ?? [], [data]);

  /** Only the rooms that can be plotted on the map. */
  const pinned = useMemo(
    () => listings.filter((listing) => hasValidCoordinate(listing)),
    [listings],
  );

  /** The one room currently selected — `null` when nothing is selected. */
  const selectedListing = useMemo(
    () => (selectedId ? listings.find((listing) => listing.id === selectedId) ?? null : null),
    [listings, selectedId],
  );

  /** Scroll the horizontal list so the selected card is in view. */
  const scrollToCard = useCallback((id: string) => {
    const index = listings.findIndex((listing) => listing.id === id);
    if (index < 0) return;
    rowRef.current?.scrollTo({
      x: Math.max(0, index * (CARD_WIDTH + spacing.md)),
      animated: true,
    });
  }, [listings]);

  const openDetail = useCallback(
    (id: string) => {
      router.push({ pathname: DETAIL_ROUTE, params: { id } } as never);
    },
    [router],
  );

  /** Tapped a marker: select that room and bring its card into view. */
  const selectFromMarker = useCallback(
    (id: string) => {
      setSelectedId(id);
      scrollToCard(id);
    },
    [scrollToCard],
  );

  /** Tapped a card: select it, bring it into view and centre the map on it. */
  const focusListing = useCallback(
    (listing: Listing) => {
      setSelectedId(listing.id);
      scrollToCard(listing.id);

      if (hasValidCoordinate(listing)) {
        mapRef.current?.animateToRegion(
          {
            latitude: listing.lat as number,
            longitude: listing.lng as number,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          },
          350,
        );
      }
    },
    [scrollToCard],
  );

  /** Open the device map app with directions to the selected room. */
  const openDirections = useCallback(async (listing: Listing) => {
    const url = buildDirectionsUrl(listing);

    if (!url) {
      Alert.alert(
        'Chưa có vị trí',
        'Phòng này chưa có vị trí bản đồ nên không thể chỉ đường.',
      );
      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Không mở được bản đồ',
        'Không mở được ứng dụng bản đồ trên thiết bị. Vui lòng thử lại.',
      );
    }
  }, []);

  const resetMap = useCallback(() => {
    mapRef.current?.animateToRegion(INITIAL_REGION, 350);
  }, []);

  if (isLoading) {
    return <LoadingState fullScreen message="Đang tải bản đồ…" />;
  }

  if (error) {
    return (
      <View style={styles.flex}>
        <ErrorState title="Không tải được bản đồ" message={error} onRetry={reload} />
      </View>
    );
  }

  const selectedPinnable = selectedListing !== null && hasValidCoordinate(selectedListing);

  return (
    <View style={styles.flex}>
      {/* --- Map ------------------------------------------------------- */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={INITIAL_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          toolbarEnabled={false}
        >
          {pinned.map((listing) => (
            <Marker
              key={listing.id}
              coordinate={{
                latitude: listing.lat as number,
                longitude: listing.lng as number,
              }}
              title={listing.title}
              description={formatRent(listing.rent)}
              pinColor={selectedId === listing.id ? colors.ink : undefined}
              onPress={() => selectFromMarker(listing.id)}
            />
          ))}
        </MapView>

        {/* Floating controls */}
        <View style={[styles.mapControls, { top: insets.top + spacing.md }]}>
          <Pressable
            onPress={resetMap}
            accessibilityRole="button"
            accessibilityLabel="Đưa bản đồ về vị trí mặc định"
            style={({ pressed }) => [styles.mapButton, pressed && styles.mapButtonPressed]}
          >
            <Navigation size={18} color={colors.ink} strokeWidth={2.8} />
          </Pressable>
        </View>

        {pinned.length === 0 ? (
          <View style={styles.mapNotice}>
            <Text style={[styles.mapNoticeText, { fontFamily: fontFamily.medium }]}>
              Chưa có phòng nào có tọa độ để hiển thị trên bản đồ.
            </Text>
          </View>
        ) : null}
      </View>

      {/* --- List below the map ---------------------------------------- */}
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleRow}>
            <MapPin size={16} color={colors.ink} strokeWidth={2.8} />
            <Text style={[styles.sheetTitle, { fontFamily: fontFamily.extrabold }]}>
              {pinned.length} phòng trên bản đồ
            </Text>
          </View>
        </View>

        {/* --- Preview of the selected room --------------------------- */}
        {selectedListing ? (
          <View style={styles.preview}>
            <View style={styles.previewTop}>
              <View style={styles.previewThumbWrap}>
                {selectedListing.image ? (
                  <Image
                    source={{ uri: selectedListing.image }}
                    style={styles.previewThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.previewThumb, styles.thumbFallback]}>
                    <Text style={[styles.thumbText, { fontFamily: fontFamily.bold }]}>—</Text>
                  </View>
                )}
              </View>

              <View style={styles.previewBody}>
                <Text
                  numberOfLines={1}
                  style={[styles.previewTitle, { fontFamily: fontFamily.bold }]}
                >
                  {selectedListing.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.previewAddress, { fontFamily: fontFamily.regular }]}
                >
                  {formatShortAddress(selectedListing)}
                </Text>
                <Text style={[styles.previewPrice, { fontFamily: fontFamily.extrabold }]}>
                  {formatRent(selectedListing.rent)}
                  <Text style={[styles.previewPriceUnit, { fontFamily: fontFamily.medium }]}>
                    /tháng
                  </Text>
                </Text>
              </View>
            </View>

            <View style={styles.previewActions}>
              <Pressable
                onPress={() => openDetail(selectedListing.id)}
                accessibilityRole="button"
                accessibilityLabel="Xem chi tiết phòng đang chọn"
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.actionPrimary,
                  pressed && styles.actionPressed,
                ]}
              >
                <MapPin size={15} color={colors.ink} strokeWidth={2.8} />
                <Text style={[styles.actionPrimaryText, { fontFamily: fontFamily.bold }]}>
                  Xem chi tiết
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  void openDirections(selectedListing);
                }}
                disabled={!selectedPinnable}
                accessibilityRole="button"
                accessibilityLabel="Chỉ đường tới phòng đang chọn"
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.actionSecondary,
                  !selectedPinnable ? styles.actionDisabled : null,
                  pressed && styles.actionPressed,
                ]}
              >
                <Navigation size={15} color={colors.ink} strokeWidth={2.8} />
                <Text style={[styles.actionSecondaryText, { fontFamily: fontFamily.bold }]}>
                  Chỉ đường
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <ScrollView
          ref={rowRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.row,
            { paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          {listings.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                title="Chưa có phòng nào"
                description="Hãy thử tìm với bộ lọc khác."
                icon={Home}
              />
            </View>
          ) : (
            listings.map((listing) => {
              const active = selectedId === listing.id;

              return (
                <View
                  key={listing.id}
                  style={[styles.card, active ? styles.cardActive : null]}
                >
                  {/* Tapping the card selects the room on the map. */}
                  <Pressable
                    onPress={() => focusListing(listing)}
                    accessibilityRole="button"
                    accessibilityLabel={`Chọn ${listing.title} trên bản đồ`}
                    style={({ pressed }) => [styles.cardMain, pressed && styles.cardPressed]}
                  >
                    <View style={styles.thumbWrap}>
                      {listing.image ? (
                        <Image
                          source={{ uri: listing.image }}
                          style={styles.thumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.thumb, styles.thumbFallback]}>
                          <Text style={[styles.thumbText, { fontFamily: fontFamily.bold }]}>—</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.cardBody}>
                      <Text
                        numberOfLines={1}
                        style={[styles.cardTitle, { fontFamily: fontFamily.bold }]}
                      >
                        {listing.title}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.cardAddress, { fontFamily: fontFamily.regular }]}
                      >
                        {formatShortAddress(listing)}
                      </Text>
                      <Text style={[styles.cardPrice, { fontFamily: fontFamily.extrabold }]}>
                        {formatRent(listing.rent)}
                      </Text>
                    </View>
                  </Pressable>

                  {/* Explicit action on the card itself — no long-press guesswork. */}
                  <Pressable
                    onPress={() => openDetail(listing.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Xem chi tiết ${listing.title}`}
                    style={({ pressed }) => [
                      styles.cardDetailButton,
                      pressed && styles.cardDetailButtonPressed,
                    ]}
                  >
                    <MapPin size={13} color={colors.ink} strokeWidth={2.8} />
                    <Text style={[styles.cardDetailText, { fontFamily: fontFamily.bold }]}>
                      Xem chi tiết
                    </Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },

  mapWrap: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: spacing.lg,
  },
  mapButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    ...shadow.sm,
  },
  mapButtonPressed: {
    opacity: 0.75,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  mapNotice: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  mapNoticeText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  sheet: {
    paddingTop: spacing.md,
    borderTopWidth: borderWidth.lg,
    borderTopColor: colors.ink,
    backgroundColor: colors.background,
  },
  sheetHeader: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sheetTitle: {
    fontSize: fontSize.md,
    color: colors.ink,
  },

  /* --- Preview of the selected room ------------------------------- */
  preview: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    ...shadow.sm,
  },
  previewTop: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  previewThumbWrap: {
    width: 68,
    height: 68,
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  previewThumb: {
    width: '100%',
    height: '100%',
  },
  previewBody: {
    flex: 1,
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  previewAddress: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  previewPrice: {
    marginTop: spacing.xs,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  previewPriceUnit: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
  },
  actionPrimary: {
    backgroundColor: colors.primary,
  },
  actionSecondary: {
    backgroundColor: colors.surface,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  actionPressed: {
    opacity: 0.75,
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
  actionPrimaryText: {
    fontSize: fontSize.xs,
    color: colors.ink,
  },
  actionSecondaryText: {
    fontSize: fontSize.xs,
    color: colors.ink,
  },

  row: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyWrap: {
    width: 300,
  },

  card: {
    width: CARD_WIDTH,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  cardActive: {
    borderWidth: borderWidth.lg,
    backgroundColor: colors.primary,
  },
  cardMain: {
    width: '100%',
  },
  cardPressed: {
    opacity: 0.8,
  },
  thumbWrap: {
    width: '100%',
    height: 78,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  thumbText: {
    fontSize: fontSize.lg,
    color: colors.textSubtle,
  },
  cardBody: {
    padding: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  cardAddress: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  cardPrice: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  cardDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  cardDetailButtonPressed: {
    opacity: 0.7,
  },
  cardDetailText: {
    fontSize: fontSize.xs,
    color: colors.ink,
  },
});
