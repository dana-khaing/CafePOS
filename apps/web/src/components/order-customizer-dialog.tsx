'use client'

import { Check, X } from 'lucide-react'
import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react'

import type { MenuItem, ModifierGroup } from '@cafepos/domain'

import {
  getGroupSelectionSummary,
  isItemCustomizationComplete,
  type ModifierSelections,
} from '@/lib/order-customizer'
import { useLocale } from './locale-provider'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

type OrderCustomizerProduct = Readonly<{
  item: MenuItem
  modifierGroups: readonly ModifierGroup[]
}>

export function OrderCustomizerDialog({
  product,
  selections,
  onToggleChoice,
  onConfirm,
  onCancel,
}: {
  product: OrderCustomizerProduct
  selections: ModifierSelections
  onToggleChoice: (
    itemId: string,
    group: ModifierGroup,
    optionId: string,
  ) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const { locale, money: formatMoney, t } = useLocale()
  const dialogRef = useRef<HTMLDivElement>(null)
  const label = (text: Readonly<{ en: string; th?: string }>) =>
    locale === 'th' && text.th ? text.th : text.en
  const requiredGroups = useMemo(
    () => product.modifierGroups.filter((group) => group.minimum > 0),
    [product.modifierGroups],
  )
  const optionalGroups = useMemo(
    () => product.modifierGroups.filter((group) => group.minimum === 0),
    [product.modifierGroups],
  )
  const canConfirm = isItemCustomizationComplete(
    product.item,
    new Map(product.modifierGroups.map((group) => [group.id, group])),
    selections,
  )

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const containFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key !== 'Tab') return
    const controls =
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) ?? []
    if (!controls.length) return
    const first = controls[0]!
    const last = controls[controls.length - 1]!
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === dialogRef.current)
    ) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const renderGroup = (group: ModifierGroup) => {
    const selected = selections[group.id] ?? []
    const summary = getGroupSelectionSummary(group, selected)
    return (
      <section
        key={group.id}
        className="rounded-xl border bg-background/60 p-4 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">{label(group.name)}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {group.minimum > 0
                ? `${t('required')} · ${group.minimum}`
                : `${t('optional')} · ${group.maximum}`}
            </p>
          </div>
          <Badge variant={group.minimum > 0 ? 'warning' : 'secondary'}>
            {summary.selectedCount}/{group.maximum}
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {group.options.map((option) => {
            const selectedNow = selected.includes(option.id)
            const selectionFull =
              !selectedNow && summary.selectedCount >= group.maximum
            return (
              <Button
                key={option.id}
                type="button"
                size="sm"
                variant={selectedNow ? 'secondary' : 'outline'}
                aria-pressed={selectedNow}
                disabled={!option.available || selectionFull}
                onClick={() =>
                  onToggleChoice(product.item.id, group, option.id)
                }
              >
                {selectedNow && <Check aria-hidden="true" />}
                <span className="truncate">{label(option.name)}</span>
                <span className="text-xs text-muted-foreground">
                  +{formatMoney(option.priceDelta.minor)}
                </span>
              </Button>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customizer-title"
      ref={dialogRef}
      tabIndex={-1}
      onKeyDown={containFocus}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <article className="w-full max-w-3xl rounded-2xl border bg-card shadow-2xl">
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6">
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {t('customizeItem')}
              </p>
              <h2 id="customizer-title" className="mt-1 text-2xl font-semibold">
                {label(product.item.name)}
              </h2>
              <p className="mt-1 text-muted-foreground">
                {formatMoney(product.item.price.minor)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              aria-label={t('cancel')}
            >
              <X aria-hidden="true" />
            </Button>
          </header>

          {requiredGroups.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('required')}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {t('completeRequiredOptions')}
                </span>
              </div>
              <div className="space-y-3">{requiredGroups.map(renderGroup)}</div>
            </div>
          )}

          {optionalGroups.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t('optional')}
              </h3>
              <div className="space-y-3">{optionalGroups.map(renderGroup)}</div>
            </div>
          )}

          {!canConfirm && (
            <p className="mt-4 rounded-lg bg-warning/10 px-3 py-2 text-sm text-foreground">
              {t('completeRequiredOptions')}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onCancel}>
              {t('cancel')}
            </Button>
            <Button onClick={onConfirm} disabled={!canConfirm}>
              {t('addToOrder')}
            </Button>
          </div>
        </div>
      </article>
    </div>
  )
}
