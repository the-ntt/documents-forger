import { Command } from 'commander';
import fs from 'fs';
import { createAppContext } from '../../app';
import logger from '../../logger';

export function registerBrandCommands(program: Command): void {
  const brand = program.command('brand').description('Brand management commands');

  brand
    .command('create')
    .description('Create a new brand and start extraction')
    .requiredOption('--name <name>', 'Brand name')
    .requiredOption('--slug <slug>', 'Brand slug (unique identifier)')
    .option('--url <url>', 'Website URL to extract from')
    .option('--pdf <path>', 'PDF file path to extract from')
    .action(async (opts) => {
      const ctx = createAppContext();
      try {
        let pdfStoragePath: string | undefined;
        const sourceType = opts.url ? 'url' : 'pdf';

        if (sourceType === 'pdf') {
          if (!opts.pdf) {
            console.error('Error: --url or --pdf is required');
            process.exit(1);
          }
          const pdfBuffer = fs.readFileSync(opts.pdf);
          pdfStoragePath = `brands/${opts.slug}/source.pdf`;
          await ctx.storage.save(pdfStoragePath, pdfBuffer);
        }

        const { brand, jobId } = await ctx.brandService.create({
          name: opts.name,
          slug: opts.slug,
          sourceUrl: opts.url,
          sourceType: sourceType as 'url' | 'pdf',
          pdfStoragePath,
        });

        console.log(`Brand created: ${brand.name} (${brand.slug})`);
        console.log(`Job ID: ${jobId}`);
        console.log('Extraction will begin shortly. Check status with: brandforge brand status --slug ' + brand.slug);
      } catch (err) {
        logger.error('Failed to create brand:', err);
        process.exit(1);
      }
    });

  brand
    .command('list')
    .description('List all brands')
    .action(async () => {
      const ctx = createAppContext();
      try {
        const brands = await ctx.brandService.list();
        if (brands.length === 0) {
          console.log('No brands found.');
          return;
        }
        console.log('Brands:');
        for (const b of brands) {
          console.log(`  ${b.slug} - ${b.name} [${b.status}] (${b.document_count} docs)`);
        }
      } catch (err) {
        logger.error('Failed to list brands:', err);
        process.exit(1);
      }
    });

  brand
    .command('status')
    .description('Check brand status')
    .requiredOption('--slug <slug>', 'Brand slug')
    .action(async (opts) => {
      const ctx = createAppContext();
      try {
        const b = await ctx.brandService.getBySlug(opts.slug);
        if (!b) {
          console.error(`Brand not found: ${opts.slug}`);
          process.exit(1);
        }
        console.log(`Brand: ${b.name} (${b.slug})`);
        console.log(`Status: ${b.status}`);
        console.log(`Source: ${b.source_type} ${b.source_url || ''}`);
        if (b.error_message) console.log(`Error: ${b.error_message}`);

        const assets = await ctx.brandService.getAssets(b.id);
        if (assets.length > 0) {
          console.log('Assets:');
          for (const a of assets) {
            console.log(`  ${a.asset_type}: ${a.file_path}`);
          }
        }
      } catch (err) {
        logger.error('Failed to get brand status:', err);
        process.exit(1);
      }
    });

  brand
    .command('regenerate')
    .description('Regenerate templates for a brand')
    .requiredOption('--slug <slug>', 'Brand slug')
    .action(async (opts) => {
      const ctx = createAppContext();
      try {
        const jobId = await ctx.brandService.regenerateTemplates(opts.slug);
        console.log(`Template regeneration started. Job ID: ${jobId}`);
      } catch (err) {
        logger.error('Failed to regenerate templates:', err);
        process.exit(1);
      }
    });
}
