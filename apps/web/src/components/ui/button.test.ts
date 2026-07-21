import { describe, expect, it } from 'vitest'

import { buttonVariants } from './button'

describe('button variants', () => {
  it('keeps the minimum touch target on default actions', () => {
    expect(buttonVariants()).toContain('min-h-11')
  })

  it('provides a destructive treatment for guarded actions', () => {
    expect(buttonVariants({ variant: 'destructive' })).toContain(
      'bg-destructive',
    )
  })
})
