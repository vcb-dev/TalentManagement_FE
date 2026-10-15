export const profileKeys = {
  all: ['profile'] as const,
  page: () => [...profileKeys.all, 'page'] as const,
  attachmentPreview: (field: string, objectPath: string) =>
    [...profileKeys.all, 'attachment-preview', field, objectPath] as const,
}
