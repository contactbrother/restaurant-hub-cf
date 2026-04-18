import { supabase, MENU_IMAGES_BUCKET } from "./supabase";

export async function uploadMenuImage(restaurantId: string, blob: Blob, ext = "jpg"): Promise<string> {
  const uuid = crypto.randomUUID();
  const path = `${restaurantId}/${uuid}.${ext}`;
  const { error } = await supabase.storage.from(MENU_IMAGES_BUCKET).upload(path, blob, {
    contentType: blob.type || `image/${ext}`,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(MENU_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteMenuImageByUrl(url: string): Promise<void> {
  // public URL: .../storage/v1/object/public/menu-images/<path>
  const marker = `/${MENU_IMAGES_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.substring(idx + marker.length);
  await supabase.storage.from(MENU_IMAGES_BUCKET).remove([path]);
}
