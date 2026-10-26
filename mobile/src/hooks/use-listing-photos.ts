/**
 * `useListingPhotos` — the photo flow shared by SCENE 022 (create) and
 * SCENE 023 (edit).
 *
 * The photos of a listing live in ONE place on the backend: the
 * `Listing.photos` column, which is a JSON array of URLs. The mobile app
 * therefore keeps two lists in the form state:
 *
 *   `photos`     — the URLs already stored on the server
 *   `newPhotos`  — the local files just picked on the device, NOT yet
 *                  uploaded
 *
 * The two are kept apart on purpose: a local `file://` URI is worthless to
 * the backend and to every other device, so it must never be written into
 * `Listing.photos`. Only after `POST /api/seller/upload` answers with the
 * public URLs are those URLs sent to `PUT /api/seller/listings/:id`.
 *
 * The hook is CONTROLLED: it never owns the photo lists, it reads them from
 * the form values and writes every change back through `onChange`. That
 * way the form state is the single source of truth and the create screen
 * and the edit screen share the exact same code path.
 *
 * The cap is 12 photos per listing — the same limit the web app uses.
 */

import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { sellerApi } from '@/lib/api-client';

/** The maximum number of photos a listing may carry. */
export const MAX_LISTING_PHOTOS = 12;

/** One picked file, before it is uploaded. */
export interface LocalPhoto {
  /** The local `file://` URI of the picked file. */
  uri: string;
  /** The file name the picker reported. */
  name: string;
  /** The MIME type the picker reported. */
  type: string;
}

/** The two photo lists the listing form carries. */
export interface ListingPhotosValue {
  /** The URLs already stored on the server. */
  photos: string[];
  /** The files picked on this device, not yet uploaded. */
  newPhotos: LocalPhoto[];
}

export interface UseListingPhotosOptions {
  /** The photo lists held by the form. */
  value: ListingPhotosValue;
  /** Writes the new photo lists back into the form. */
  onChange: (next: ListingPhotosValue) => void;
}

export interface UseListingPhotosResult {
  photos: string[];
  newPhotos: LocalPhoto[];
  /** Total number of slots in use. */
  count: number;
  /** True while a batch of files is being uploaded. */
  isUploading: boolean;
  /** The last error, or `null`. */
  error: string | null;
  /**
   * Open the photo library so the seller can pick more images.
   *
   * Asks for the permission only when the library has not been granted yet,
   * and never blocks the flow: when the permission is refused the screen
   * explains what to do instead of failing silently.
   */
  pickPhotos: () => Promise<void>;
  /** Remove a stored photo (by URL). */
  removePhoto: (url: string) => void;
  /** Remove a locally picked file (by URI). */
  removeNewPhoto: (uri: string) => void;
  /**
   * Upload the picked files and return their public URLs.
   *
   * The uploaded files are appended to the stored photos and the local list
   * is cleared — but ONLY after the server confirmed. When the upload
   * fails the local files stay in the form so the seller can retry.
   */
  uploadNewPhotos: () => Promise<string[]>;
  /** Drop the error message. */
  clearError: () => void;
}

/**
 * Ask for the library permission — only when it is not granted yet.
 *
 * iOS: `NSPhotoLibraryUsageDescription` (the library authorization).
 *
 * Android: the system Photo Picker (Android 13 / API 33 and up) grants
 * access to the picked images WITHOUT any permission at all, so nothing is
 * requested there. Only the older versions (API 32 and below) need
 * `READ_EXTERNAL_STORAGE` — and the plugin asks for exactly that set.
 *
 * The permission strings live in `app.json`.
 */
async function ensureLibraryPermission(): Promise<boolean> {
  // Android 13+ — the Photo Picker needs no permission.
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) return true;

  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;

  const asked = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return asked.granted;
}

export function useListingPhotos({
  value,
  onChange,
}: UseListingPhotosOptions): UseListingPhotosResult {
  const { photos, newPhotos } = value;

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickPhotos = useCallback(async () => {
    setError(null);

    const remaining = MAX_LISTING_PHOTOS - photos.length - newPhotos.length;
    if (remaining <= 0) {
      setError(`Mỗi tin đăng chỉ có tối đa ${MAX_LISTING_PHOTOS} ảnh.`);
      return;
    }

    const granted = await ensureLibraryPermission();
    if (!granted) {
      setError(
        Platform.OS === 'ios'
          ? 'Chưa được cấp quyền truy cập thư viện ảnh. Hãy mở Cài đặt → Quyền riêng tư → Ảnh cho ứng dụng Thiên Nhãn.'
          : 'Chưa được cấp quyền đọc ảnh. Hãy cấp quyền "Ảnh" trong Cài đặt hệ thống của điện thoại.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
      // The upload endpoint accepts JPEG / PNG / GIF / WebP.
      exif: false,
    });

    if (result.canceled) return;

    const picked: LocalPhoto[] = result.assets.map((asset, index) => ({
      uri: asset.uri,
      name: asset.fileName ?? `photo-${Date.now()}-${index}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    }));

    if (picked.length === 0) return;

    // Never exceed the cap, even if the picker returns more.
    const nextNewPhotos = [...newPhotos, ...picked].slice(
      0,
      MAX_LISTING_PHOTOS - photos.length,
    );

    onChange({ photos, newPhotos: nextNewPhotos });
  }, [newPhotos, onChange, photos]);

  const removePhoto = useCallback(
    (url: string) => {
      onChange({ photos: photos.filter((item) => item !== url), newPhotos });
    },
    [newPhotos, onChange, photos],
  );

  const removeNewPhoto = useCallback(
    (uri: string) => {
      onChange({ photos, newPhotos: newPhotos.filter((item) => item.uri !== uri) });
    },
    [newPhotos, onChange, photos],
  );

  const uploadNewPhotos = useCallback(async () => {
    if (newPhotos.length === 0) return [];

    setIsUploading(true);
    setError(null);

    try {
      const result = await sellerApi.uploadPhotos(
        newPhotos.map((photo) => ({ uri: photo.uri, name: photo.name, type: photo.type })),
      );

      const uploaded = result.files.map((file) => file.url);

      // The local files are dropped only now that the server owns them.
      onChange({ photos: [...photos, ...uploaded], newPhotos: [] });

      return uploaded;
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Không tải được ảnh lên. Vui lòng thử lại.';
      setError(message);
      Alert.alert('Tải ảnh thất bại', message);
      throw caught;
    } finally {
      setIsUploading(false);
    }
  }, [newPhotos, onChange, photos]);

  const clearError = useCallback(() => setError(null), []);

  return {
    photos,
    newPhotos,
    count: photos.length + newPhotos.length,
    isUploading,
    error,
    pickPhotos,
    removePhoto,
    removeNewPhoto,
    uploadNewPhotos,
    clearError,
  };
}
