export const profileKeys = {
  all: ['profile'] as const,
  page: () => [...profileKeys.all, 'page'] as const,
}
