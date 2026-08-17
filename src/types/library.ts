export type LibraryRole = "technician" | "supervisor" | "auditor" | "admin";

export type ExpiryStatus = "vigente" | "vencido" | "no_aplica";

export interface LibraryCategory {
  id: number;
  name: string;
}

export interface LibraryFolderNode {
  id: number;
  name: string;
  parent_id: number | null;
  visible_to_roles: LibraryRole[] | null;
  children: LibraryFolderNode[];
}

export interface LibraryDocumentVersion {
  id: number;
  document_id: number;
  version_sequence: number;
  version_number: string;
  version_label: string | null;
  display_version: string;
  file_type: string;
  change_log: string | null;
  emission_date: string | null;
  expiration_date: string | null;
  next_review_date: string | null;
  requires_expiry: boolean;
  expiry_status: ExpiryStatus;
  uploaded_by: string | null;
  created_at: string;
}

export interface LibraryDocument {
  id: number;
  title: string;
  document_code: string | null;
  category: LibraryCategory | null;
  folder_id: number | null;
  folder_name: string | null;
  folder_breadcrumb: string | null;
  visible_to_roles: LibraryRole[] | null;
  file_type: string | null;
  current_status: ExpiryStatus | "n/a";
  expiration_date: string | null;
  next_review_date: string | null;
  latest_version: LibraryDocumentVersion | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LibrarySharedLink {
  id: number;
  document_id: number;
  document_title: string | null;
  version_id: number | null;
  created_by_name: string;
  shared_with_name: string | null;
  reason: string;
  expires_at: string;
  is_expired: boolean;
  access_count: number;
  read_only: boolean;
  url: string;
  created_at: string;
}

export type ShareRequestStatus = "pending" | "approved" | "rejected";

export interface LibraryShareRequest {
  id: number;
  document_id: number;
  document_title: string | null;
  version_id: number | null;
  requested_by: number;
  requested_by_name: string;
  shared_with_name: string | null;
  reason: string;
  expires_in_hours: number;
  read_only: boolean;
  status: ShareRequestStatus;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  shared_link: LibrarySharedLink | null;
  created_at: string;
}

export interface SharedViewerInfo {
  found: boolean;
  expired: boolean;
  read_only: boolean;
  title: string | null;
}
