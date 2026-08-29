export function createSessionDebugGate(initiallyEnabled, install) {
  let enabled = initiallyEnabled

  return {
    isEnabled: () => enabled,
    enableForSession: () => {
      if (enabled) return false

      enabled = true
      install()
      return true
    },
  }
}

export function createTapSequence(requiredTaps, maxIntervalMs) {
  let tapCount = 0
  let lastTapAt = null

  return {
    register: (timestamp) => {
      tapCount = lastTapAt === null || timestamp - lastTapAt > maxIntervalMs ? 1 : tapCount + 1
      lastTapAt = timestamp

      if (tapCount < requiredTaps) return false

      tapCount = 0
      lastTapAt = null
      return true
    },
  }
}
