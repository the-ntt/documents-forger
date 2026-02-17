#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import { Command } from 'commander';
import { registerBrandCommands } from './commands/brand';
import { registerDocumentCommands } from './commands/document';
import { registerPromptCommands } from './commands/prompt';
import { registerUtilCommands } from './commands/util';

const program = new Command();

program
  .name('brandforge')
  .description('BrandForge - Brand report generation system')
  .version('1.0.0');

registerBrandCommands(program);
registerDocumentCommands(program);
registerPromptCommands(program);
registerUtilCommands(program);

program.parse();
