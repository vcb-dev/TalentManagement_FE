export const profileKeys = {
  all: ['profile'] as const,
  page: () => [...profileKeys.all, 'page'] as const,
  userSelf: () => [...profileKeys.all, 'user-self'] as const,
  teamLeaderOptions: () => [...profileKeys.all, 'team-leader-options'] as const,
  attachmentPreview: (field: string, objectPath: string) =>
    [...profileKeys.all, 'attachment-preview', field, objectPath] as const,
}
