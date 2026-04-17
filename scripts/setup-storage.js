/**
 * Creates the `product-images` Supabase Storage bucket (public).
 * Run once: node scripts/setup-storage.js
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = "https://byszshyheuzdeegezetf.supabase.co";
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE) {
  console.error("Set SUPABASE_SERVICE_KEY env var (service_role key, NOT the anon key).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

const { data, error } = await supabase.storage.createBucket("product-images", {
  public: true,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  fileSizeLimit: 5 * 1024 * 1024, // 5 MB
});

if (error) {
  if (error.message?.includes("already exists")) {
    console.log("✓ Bucket 'product-images' already exists — nothing to do.");
  } else {
    console.error("Error:", error.message);
    process.exit(1);
  }
} else {
  console.log("✓ Bucket 'product-images' created successfully.", data);
}
