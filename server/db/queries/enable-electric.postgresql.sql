-- Enable Electric SQL sync for all tables
-- This allows Electric to track changes via logical replication
-- This is idempotent and safe to run multiple times

-- Drop and recreate publication for Electric SQL
DROP PUBLICATION IF EXISTS electric_publication;

-- Create publication with all tables that need to be synced
CREATE PUBLICATION electric_publication FOR TABLE 
  users,
  companies,
  company_members,
  company_invites;

