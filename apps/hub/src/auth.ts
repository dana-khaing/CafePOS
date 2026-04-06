import { timingSafeEqual } from 'node:crypto'

function safeEqual(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate)
  const expectedBuffer = Buffer.from(expected)
  if (candidateBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(candidateBuffer, expectedBuffer)
}

export function authenticatesBranch(
  authorizationHeader: string | undefined,
  branchToken: string,
): boolean {
  return safeEqual(authorizationHeader ?? '', `Bearer ${branchToken}`)
}

export function authenticatesManagerPin(
  pinHeader: string | string[] | undefined,
  refundApprovalPin: string,
): boolean {
  const pin = Array.isArray(pinHeader)
    ? (pinHeader[0] ?? '')
    : (pinHeader ?? '')
  return safeEqual(pin, refundApprovalPin)
}
