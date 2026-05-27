import { CrudResourcePage } from './CrudResourcePage'
import { resourceConfigs } from '../config/resources'

export function RolesPage() {
  return <CrudResourcePage config={resourceConfigs.roles} />
}
