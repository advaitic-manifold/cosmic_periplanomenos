import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// SITE/BASE come from the environment so one build config serves both
// https://USER.github.io/ (BASE=/) and https://USER.github.io/REPO/ (BASE=/REPO/).
export default defineConfig({
  site: process.env.SITE ?? 'https://advaitic-manifold.github.io',
  base: process.env.BASE ?? '/',
  integrations: [react(), sitemap()],
});
