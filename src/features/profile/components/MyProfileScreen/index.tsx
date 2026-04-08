import { MyProfileScreen } from './MyProfileScreen'
import { useMyProfilePage } from '@/features/profile/hooks'

export function MyProfileScreenContainer() {
  const { data, isLoading } = useMyProfilePage()
  return <MyProfileScreen page={data} isLoading={isLoading} />
}

export { MyProfileScreen }
