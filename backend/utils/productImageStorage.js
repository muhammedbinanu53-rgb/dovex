const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { getSupabaseClient, isSupabaseConfigured } = require("./supabase");
const { uploadsDirectory, productUploadsDirectory } = require("./storagePaths");

const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "product-images";

async function uploadProductImages(files = []) {
  const results = [];
  for (const file of files) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeExtension = ({ ".jpg": ".jpg", ".jpeg": ".jpg", ".png": ".png", ".webp": ".webp" })[extension] ||
      ({ "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" })[file.mimetype];
    if (!safeExtension) throw new Error("INVALID_IMAGE_TYPE");
    const filename = `${crypto.randomUUID()}${safeExtension}`;

    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseClient().storage
        .from(bucketName)
        .upload(filename, file.buffer, { contentType: file.mimetype, upsert: false });
      if (error) throw new Error(`Image upload failed: ${error.message}`);
      const { data: publicData } = getSupabaseClient().storage.from(bucketName).getPublicUrl(data.path);
      results.push(publicData.publicUrl);
    } else {
      await fs.mkdir(productUploadsDirectory, { recursive: true });
      await fs.writeFile(path.join(productUploadsDirectory, filename), file.buffer);
      results.push(`/uploads/products/${filename}`);
    }
  }
  return results;
}

function getSupabaseObjectPath(imageUrl) {
  if (!isSupabaseConfigured() || typeof imageUrl !== "string") return null;
  try {
    const parsed = new URL(imageUrl);
    const expectedOrigin = new URL(process.env.SUPABASE_URL).origin;
    const prefix = `/storage/v1/object/public/${bucketName}/`;
    if (parsed.origin !== expectedOrigin || !parsed.pathname.startsWith(prefix)) return null;
    return decodeURIComponent(parsed.pathname.slice(prefix.length));
  } catch {
    return null;
  }
}

async function removeProductImages(images = []) {
  const supabasePaths = images.map(getSupabaseObjectPath).filter(Boolean);
  if (supabasePaths.length) {
    const { error } = await getSupabaseClient().storage.from(bucketName).remove(supabasePaths);
    if (error) console.error("Unable to remove unused product images:", error.message);
  }

  const localPaths = images.filter(image =>
    typeof image === "string" && /^\/uploads\/products\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/i.test(image)
  );
  await Promise.all(localPaths.map(image =>
    fs.unlink(path.join(productUploadsDirectory, path.basename(image))).catch(() => {})
  ));
}

async function removeTemporaryUploads(files = []) {
  await Promise.all(files.filter(file => file.path).map(file => fs.unlink(file.path).catch(() => {})));
}

module.exports = {
  bucketName,
  uploadsDirectory,
  productUploadsDirectory,
  isSupabaseConfigured,
  uploadProductImages,
  removeProductImages,
  removeTemporaryUploads
};
