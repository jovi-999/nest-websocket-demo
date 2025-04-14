import { Test, TestingModule } from '@nestjs/testing';
import { NinjasController } from './ninjas.controller';
import { NinjasService } from './ninjas.service';

describe('NinjasController', () => {
  let controller: NinjasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NinjasController],
      providers: [NinjasService],
    }).compile();

    controller = module.get<NinjasController>(NinjasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
