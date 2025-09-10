export interface ClickUpConfig {
  apiToken: string;
  workspaceId: string;
  spaceId: string;
  proprietariosListId: string;
  inquilinosListId: string;
}

export interface ClickUpTask {
  id: string;
  name: string;
  status: {
    status: string;
    color: string;
  };
  priority: {
    priority: string;
    color: string;
  };
  url: string;
  custom_fields: Array<{
    id: string;
    name: string;
    value: any;
  }>;
}

export interface ClickUpIntegrationRecord {
  id: string;
  ticket_id: string;
  clickup_task_id: string;
  clickup_list_id: string;
  sync_status: 'pending' | 'synced' | 'error';
  last_sync: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}