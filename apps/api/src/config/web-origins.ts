export function getWebAppOrigins(
  configuredOrigins: string | undefined,
  nodeEnv: string | undefined,
): string[] {
  const origins = configuredOrigins
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins?.length) return origins;
  return nodeEnv === 'development' ? ['http://localhost:8081'] : [];
}
