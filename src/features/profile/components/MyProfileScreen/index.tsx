import { MyProfileScreen } from './MyProfileScreen'
import { useMyProfilePage } from '@/features/profile/hooks'

export function MyProfileScreenContainer() {
  const { data, isLoading, isError, refetch, isFetching } = useMyProfilePage()
  return (
    <MyProfileScreen
      page={data}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      retrying={isFetching}
    />
  )
}

export { MyProfileScreen }
