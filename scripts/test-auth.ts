import 'dotenv/config';
import { AuthService } from '../src/services/authService';

async function run() {
  const auth = new AuthService();
  const unique = Date.now();
  const email = `test${unique}@example.com`;
  const password = 'Test@12345';
  const name = 'Test User';

  console.log('--- Registro ---');
  const registerRes = await auth.register({ name, email, password });
  console.log({
    accessToken: registerRes.accessToken.slice(0, 20) + '...',
    refreshToken: registerRes.refreshToken.slice(0, 20) + '...',
    user: registerRes.user,
  });

  console.log('\n--- Login ---');
  const loginRes = await auth.login({ email, password });
  console.log({
    accessToken: loginRes.accessToken.slice(0, 20) + '...',
    refreshToken: loginRes.refreshToken.slice(0, 20) + '...',
    user: loginRes.user,
  });

  console.log('\n--- Refresh ---');
  const refreshRes = await auth.refreshToken({ refreshToken: loginRes.refreshToken });
  console.log({
    accessToken: refreshRes.accessToken.slice(0, 20) + '...',
    refreshToken: refreshRes.refreshToken.slice(0, 20) + '...',
  });

  console.log('\n--- Logout ---');
  await auth.logout({ refreshToken: refreshRes.refreshToken });
  console.log('Logout realizado. Tentando refresh novamente (deve falhar)...');
  try {
    await auth.refreshToken({ refreshToken: refreshRes.refreshToken });
    console.log('Erro: refresh deveria ter falhado mas não falhou');
  } catch (e: any) {
    console.log('Refresh falhou como esperado:', e?.message || e);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


