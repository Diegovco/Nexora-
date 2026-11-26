export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000/api',
  usuario: {
    id: 'demo-001',
    nombre: 'Ana Ruiz',
  },
  // Clave que imprime seed.py al cargar los datos. Nunca va a producción: allí
  // las acciones de administración deben usar autenticación real.
  adminApiKey: 'nx_CLAVE_QUE_IMPRIME_SEED',
};
