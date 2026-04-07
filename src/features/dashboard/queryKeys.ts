export const dashboardKeys = {
  all: ['dashboard'] as const,
  me: () => [...dashboardKeys.all, 'me'] as const,
}

