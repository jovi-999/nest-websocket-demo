import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { NinjasService } from './ninjas.service';
import { UpdateNinjaDto } from './dto/update-ninja.dto';
import { CreateNinjaDto } from './dto/create-ninja.dto';

@Controller('ninjas')
export class NinjasController {
  constructor(private readonly ninjasService: NinjasService) {}

  // @Get() 裝飾器，用來定義 GET 請求的路由
  // @Get()
  // findAll() {
  //   return this.ninjasService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.ninjasService.findOne(+id);
  // }

  // // 取得模擬 api 的資料，訪問 http://localhost:3000/ninjas/user/1 時，會執行這個函數
  // @Get('user/:id')
  // getUser(@Param('id') id: string, @Query('clientId') clientId?: string) {
  //   console.log(`收到請求: id=${id}, clientId=${clientId || '未提供'}`);
  //   return this.ninjasService.getFakeData(+id, clientId || 'all');
  // }

  // // @Post() 裝飾器，用來定義 POST 請求的路由
  // @Post()
  // create(@Body() createNinjaDto: CreateNinjaDto) {
  //   return this.ninjasService.create(createNinjaDto);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateNinjaDto: UpdateNinjaDto) {
  //   return this.ninjasService.update(+id, updateNinjaDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.ninjasService.remove(+id);
  // }
}
