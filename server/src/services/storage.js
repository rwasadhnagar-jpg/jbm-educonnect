import supabase from '../db/supabase.js'

const BUCKET = 'homework-pdfs'
const TTL_SECONDS = 900 // 15 minutes

export async function getSignedUrl(filePath) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, TTL_SECONDS)
  if (error) throw new Error(`Failed to generate signed URL: ${error.message}`)
  return data.signedUrl
}

export async function uploadFile(buffer, fileName, mimeType) {
  const { data, error } = await supabase.storage.from(BUCKET).upload(fileName, buffer, {
    contentType: mimeType,
    upsert: false
  })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  return data.path
}

export async function deleteFile(filePath) {
  const { error } = await supabase.storage.from(BUCKET).remove([filePath])
  if (error) console.warn(`Failed to delete file ${filePath}:`, error.message)
}
