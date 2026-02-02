-- Database initialization script for matrimonial application
-- This script runs automatically when PostgreSQL container starts

-- Create necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON "User" (phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON "User" (email);
CREATE INDEX IF NOT EXISTS idx_users_active ON "User" (isActive);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON "Profile" (userId);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON "Profile" (gender);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON "Profile" (age);
CREATE INDEX IF NOT EXISTS idx_profiles_visible ON "Profile" (profileVisible);
CREATE INDEX IF NOT EXISTS idx_interests_from_user ON "Interest" (fromUserId);
CREATE INDEX IF NOT EXISTS idx_interests_to_user ON "Interest" (toUserId);
CREATE INDEX IF NOT EXISTS idx_interests_status ON "Interest" (status);
CREATE INDEX IF NOT EXISTS idx_messages_from_user ON "Message" (fromUserId);
CREATE INDEX IF NOT EXISTS idx_messages_to_user ON "Message" (toUserId);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON "OTP" (phone);
CREATE INDEX IF NOT EXISTS idx_otp_purpose ON "OTP" (purpose);
CREATE INDEX IF NOT EXISTS idx_otp_used ON "OTP" (isUsed);

-- Create some sample data for testing (optional)
-- INSERT INTO "User" (id, email, phone, passwordHash, role, isEmailVerified, isPhoneVerified, isActive, createdAt, updatedAt) 
-- VALUES 
-- (uuid_generate_v4(), 'test1@example.com', '+1234567890', NULL, 'USER', true, true, true, NOW(), NOW()),
-- (uuid_generate_v4(), 'test2@example.com', '+1234567891', NULL, 'USER', true, true, true, NOW(), NOW());