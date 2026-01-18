import { AsyncResource } from './useAsyncLoader'
import { chartService } from '../services/chart.service'

export class UserCharts extends AsyncResource<any[]> {
  constructor(autoLoad = true) {
    super(() => chartService.getUserCharts(), autoLoad)
  }
}
