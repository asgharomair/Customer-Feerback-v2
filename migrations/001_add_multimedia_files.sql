-- Migration: Add multimedia_files table
-- Created: 2024-01-XX

-- Create multimedia_files table
CREATE TABLE IF NOT EXISTS multimedia_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    feedback_id UUID REFERENCES feedback_responses(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('voice', 'image')),
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    original_file_name VARCHAR(255),
    upload_status VARCHAR(50) DEFAULT 'pending' CHECK (upload_status IN ('pending', 'completed', 'failed')),
    is_public BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    expires_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_multimedia_files_tenant_id ON multimedia_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_multimedia_files_feedback_id ON multimedia_files(feedback_id);
CREATE INDEX IF NOT EXISTS idx_multimedia_files_file_type ON multimedia_files(file_type);
CREATE INDEX IF NOT EXISTS idx_multimedia_files_upload_status ON multimedia_files(upload_status);
CREATE INDEX IF NOT EXISTS idx_multimedia_files_created_at ON multimedia_files(created_at);
CREATE INDEX IF NOT EXISTS idx_multimedia_files_tenant_type ON multimedia_files(tenant_id, file_type);
CREATE INDEX IF NOT EXISTS idx_multimedia_files_is_deleted ON multimedia_files(is_deleted);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_multimedia_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_multimedia_files_updated_at
    BEFORE UPDATE ON multimedia_files
    FOR EACH ROW
    EXECUTE FUNCTION update_multimedia_files_updated_at();

-- Add comments for documentation
COMMENT ON TABLE multimedia_files IS 'Stores multimedia files (voice recordings and images) associated with feedback responses';
COMMENT ON COLUMN multimedia_files.file_type IS 'Type of file: voice or image';
COMMENT ON COLUMN multimedia_files.upload_status IS 'Status of file upload: pending, completed, or failed';
COMMENT ON COLUMN multimedia_files.is_public IS 'Whether the file can be publicly accessed';
COMMENT ON COLUMN multimedia_files.is_deleted IS 'Soft delete flag for file lifecycle management';
COMMENT ON COLUMN multimedia_files.expires_at IS 'Expiration timestamp for temporary files';
COMMENT ON COLUMN multimedia_files.metadata IS 'Additional file metadata in JSON format'; 