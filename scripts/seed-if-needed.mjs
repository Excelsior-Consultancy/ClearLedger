import { execSync } from 'child_process';

if (process.env.SEED_ON_DEPLOY === 'true') {
  console.log('SEED_ON_DEPLOY=true — running prisma db seed...');
  execSync('npx prisma db seed', { stdio: 'inherit' });
} else {
  console.log('SEED_ON_DEPLOY not set — skipping seed.');
}
