export const getClientDisplayName = (client: any) => {
  if (!client) return 'Unnamed client'
  const candidates = [
    client.clientType === 'commercial' ? client.companyName : client.contactName,
    client.name,
    client.companyName,
    client.contactName,
    client.clientName,
    client.client_name,
  ]
  const found = candidates.find(
    (value) => typeof value === 'string' && value.trim().length > 0,
  )
  return found ? found.trim() : 'Unnamed client'
}
