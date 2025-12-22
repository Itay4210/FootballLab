import { Controller, Post } from '@nestjs/common';
import { SimulationService } from './simulation.service';
@Controller('simulation')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}
  @Post('run')
  runMatchday() {
    return this.simulationService.runSeasonMatchday();
  }

  @Post('reset')
  reset() {
    return this.simulationService.resetData();
  }
}
