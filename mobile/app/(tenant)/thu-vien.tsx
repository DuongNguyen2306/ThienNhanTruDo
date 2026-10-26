/**
 * SCENE 012 — Gallery.
 *
 * The full-screen photo viewer. It is opened from the room detail screen
 * (SCENE 011) and shows every photo of the listing as a pager, with the
 * index of the current photo and a thumbnail strip at the bottom.
 *
 * The photos come from the same `GET /api/listings/:id` endpoint as the
 * detail screen, so nothing is faked and no extra request is needed for
 * the images themselves.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Images } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/ui';
import { listingsApi, resolveMediaUrl } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/use-async-data';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { Listing } from '@/types/listing';

/** The width of a thumbnail in the bottom strip. */
const THUMB_SIZE = 60;

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string }>();
  const listingId = typeof params.id === 'string' ? params.id : '';

  const [index, setIndex] = useState(0);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const fetcher = useCallback(async () => {
    if (!listingId) throw new Error('Không tìm thấy tin đăng.');
    const result = await listingsApi.detail(listingId);
    return result.listing;
  }, [listingId]);

  const { data: listing, isLoading, error, reload } = useAsyncData<Listing>(fetcher, [listingId]);

  const photos = useMemo(() => {
    if (!listing) return [];
    if (listing.photos && listing.photos.length > 0) return listing.photos;
    return listing.image ? [listing.image] : [];
  }, [listing]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/(tenant)/(tabs)/tim-phong' as never);
    }
  }, [router]);

  const jumpTo = useCallback(
    (target: number) => {
      setIndex(target);
      scrollRef.current?.scrollTo({ x: target * width, animated: true });
    },
    [width],
  );

  if (isLoading) {
    return <LoadingState fullScreen message="Đang tải thư viện ảnh…" />;
  }

  if (error || !listing) {
    return (
      <View style={styles.flex}>
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
          <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Quay lại">
            <ArrowLeft size={22} color={colors.ink} strokeWidth={3} />
          </Pressable>
        </View>
        <ErrorState
          title="Không tải được thư viện ảnh"
          message={error ?? 'Tin đăng không tồn tại.'}
          onRetry={reload}
          onBack={goBack}
        />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {/* --- Pager ---------------------------------------------------- */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / width);
          setIndex(next);
        }}
      >
        {photos.map((photo, photoIndex) => (
          <View key={`${photo}-${photoIndex}`} style={[styles.page, { width }]}>
            <Image source={{ uri: resolveMediaUrl(photo) ?? photo }} style={styles.image} resizeMode="contain" />
          </View>
        ))}
      </ScrollView>

      {/* --- Top bar -------------------------------------------------- */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={8}
          style={({ pressed }) => [styles.topButton, pressed && styles.topButtonPressed]}
        >
          <ArrowLeft size={20} color={colors.ink} strokeWidth={3} />
        </Pressable>

        <View style={styles.counter}>
          <Images size={14} color={colors.ink} strokeWidth={2.8} />
          <Text style={[styles.counterText, { fontFamily: fontFamily.bold }]}>
            {photos.length > 0 ? `${index + 1} / ${photos.length}` : '0 / 0'}
          </Text>
        </View>
      </View>

      {/* --- Bottom strip ---------------------------------------------- */}
      {photos.length > 1 ? (
        <View style={[styles.strip, { paddingBottom: insets.bottom + spacing.md }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {photos.map((photo, photoIndex) => (
              <Pressable
                key={`${photo}-thumb`}
                onPress={() => jumpTo(photoIndex)}
                accessibilityRole="button"
                accessibilityLabel={`Ảnh ${photoIndex + 1}`}
                style={[
                  styles.thumb,
                  photoIndex === index ? styles.thumbActive : null,
                ]}
              >
                <Image source={{ uri: resolveMediaUrl(photo) ?? photo }} style={styles.thumbImage} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  page: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  topButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    ...shadow.sm,
  },
  topButtonPressed: {
    opacity: 0.7,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
  },
  counterText: {
    fontSize: fontSize.sm,
    color: colors.ink,
  },

  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: borderWidth.md,
    borderTopColor: colors.ink,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    marginRight: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.borderMuted,
    overflow: 'hidden',
  },
  thumbActive: {
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
});
