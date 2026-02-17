import { Command } from 'commander';
import fs from 'fs';
import { createAppContext } from '../../app';
import { PromptType } from '../../services/PromptService';
import logger from '../../logger';

export function registerPromptCommands(program: Command): void {
  const prompt = program.command('prompt').description('Prompt management commands');

  prompt
    .command('show')
    .description('Show the effective prompt for a type')
    .requiredOption('--type <type>', 'Prompt type (extraction, report_template, slides_template)')
    .option('--brand <slug>', 'Brand slug for brand-specific override')
    .action(async (opts) => {
      const ctx = createAppContext();
      try {
        const p = await ctx.promptService.getByType(opts.type as PromptType, opts.brand);
        console.log(`Type: ${p.type}`);
        console.log(`Brand-specific: ${p.brand_id ? 'yes' : 'no (default)'}`);
        console.log('---');
        console.log(p.content);
      } catch (err) {
        logger.error('Failed to show prompt:', err);
        process.exit(1);
      }
    });

  prompt
    .command('set')
    .description('Set a prompt override')
    .requiredOption('--type <type>', 'Prompt type')
    .requiredOption('--file <path>', 'Path to prompt file')
    .option('--brand <slug>', 'Brand slug for brand-specific override')
    .action(async (opts) => {
      const ctx = createAppContext();
      try {
        const content = fs.readFileSync(opts.file, 'utf-8');
        await ctx.promptService.upsert(opts.type as PromptType, content, opts.brand);
        console.log('Prompt updated successfully.');
      } catch (err) {
        logger.error('Failed to set prompt:', err);
        process.exit(1);
      }
    });
}
