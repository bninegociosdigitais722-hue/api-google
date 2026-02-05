const missingVar = (name: string) => new Error(`Variável de ambiente obrigatória ausente: ${name}`)

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw missingVar(name)
  }
  return value
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined
}

export function requireNotInProduction(name: string): string {
  const value = optionalEnv(name)
  if (!value && process.env.NODE_ENV === 'production') {
    throw missingVar(name)
  }
  return value ?? ''
}
