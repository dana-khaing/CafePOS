export async function verifyManagerPin(
  pin: string,
  fetcher: typeof fetch = fetch,
  hubUrl = process.env.NEXT_PUBLIC_BRANCH_HUB_URL ?? 'http://127.0.0.1:4310',
  token = process.env.NEXT_PUBLIC_BRANCH_HUB_TOKEN ?? '',
) {
  if (!/^\d{4,12}$/.test(pin))
    throw new TypeError('Manager PIN format is invalid')
  const response = await fetcher(`${hubUrl}/v1/manager/verify`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'x-manager-pin': pin },
  })
  if (!response.ok)
    throw new Error(`Manager approval rejected (${response.status})`)
}
