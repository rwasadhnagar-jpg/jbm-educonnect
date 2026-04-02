-- JBM EduConnect — Supabase Storage Policies
-- Run AFTER schema.sql

-- Create the PDF bucket (no public access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'homework-pdfs',
  'homework-pdfs',
  FALSE,
  10485760,
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Only teachers and admins can upload PDFs
CREATE POLICY "pdfs_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'homework-pdfs'
    AND (current_setting('request.jwt.claims', true)::jsonb->>'role') IN ('teacher','admin')
  );

-- Only teachers and admins can delete PDFs
CREATE POLICY "pdfs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'homework-pdfs'
    AND (current_setting('request.jwt.claims', true)::jsonb->>'role') IN ('teacher','admin')
  );

-- Admins can do everything
CREATE POLICY "pdfs_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'homework-pdfs'
    AND (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'admin'
  );

-- NOTE: There is NO SELECT policy for direct storage access.
-- All PDF downloads go through the backend endpoint:
--   GET /api/homework/:id/pdf-url
-- which returns a signed URL valid for 15 minutes only.
-- Students never receive a permanent storage URL.
