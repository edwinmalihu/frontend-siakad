import { CrudResourcePage } from './CrudResourcePage'
import { resourceConfigs } from '../config/resources'

export function PermissionsPage() {
  return <CrudResourcePage config={resourceConfigs.permissions} />
}
