-- Add department_code to campaigns table for routing
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS department_code text DEFAULT 'marketing';

-- Update existing campaigns to have marketing department
UPDATE campaigns SET department_code = 'marketing' WHERE department_code IS NULL;