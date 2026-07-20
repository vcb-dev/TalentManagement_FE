export const editorClassesKeys = {
  all: ['editor-classes'] as const,
  list: () => [...editorClassesKeys.all, 'list'] as const,
}
