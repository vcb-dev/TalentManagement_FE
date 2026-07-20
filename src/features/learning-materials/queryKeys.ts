export const learningMaterialsKeys = {
  all: ['learning-materials'] as const,
  managerList: () => [...learningMaterialsKeys.all, 'manager-list'] as const,
  myList: () => [...learningMaterialsKeys.all, 'my-list'] as const,
}
