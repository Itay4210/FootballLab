import { Controller, Post } from '@nestjs/common';
import { SimulationService } from './simulation.service';

@Controller('simulation')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Post('run')
  runDaily() {
    return this.simulationService.runDailySimulation();
  }
}