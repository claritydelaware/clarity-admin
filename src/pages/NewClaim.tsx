import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { CLINICIANS, KNOWN_PAYERS, SERVICE_CODES, SUBMISSION_METHODS, CLAIM_STATUSES } from '../types'
import type { NewClaimInput, Clinician } from '../types'
import { useCreateClaim, useCaseloads, useClaims } from '../hooks/useClaims'
import { useContractRates, makeLookup } from '../hooks/useContractRates'
import { formatCurrency } from '../lib/utils'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import ErrorBanner from '../components/ui/ErrorBanner'

interface FormValues {
  claimDate: string
  clinician: Clinician
  clientId: string
  insurance: string
  claimId: string
  serviceCode: string
  submissionMethod: string
  status: string
  clientAmount: string
  insuranceAmount: string
  paymentDateReceived: string
  notes: string
  supplemental?: {
    serviceCode: string
    claimId: string
    clientAmount: string
    insuranceAmount: string
    notes: string
  }
}

const DISCONTINUED_CODES = ['96127', '96136']
const DISCONTINUED_AFTER = new Date('2026-01-15')
const HHO_PAYERS = ['health options']

function todayInputDate(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function NewClaim() {
  const navigate = useNavigate()
  const { mutateAsync: mutatePrimary, isPending: primaryPending, isError, error } = useCreateClaim()
  const { mutateAsync: mutateSupplemental, isPending: suppPending } = useCreateClaim()
  const { data: caseloads } = useCaseloads()
  const { data: claims } = useClaims()

  const { data: contractRateRows } = useContractRates()
  const lookupRate = makeLookup(contractRateRows)

  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set())
  const [showSupplemental, setShowSupplemental] = useState(false)
  const [suppError, setSuppError] = useState<string | null>(null)
  const [comboOpen, setComboOpen] = useState(false)
  const [comboQuery, setComboQuery] = useState('')
  const [insuranceAmountSource, setInsuranceAmountSource] = useState<'contract-rate' | 'prior-claim' | null>(null)
  const insuranceManualRef = useRef(false)
  const comboRef = useRef<HTMLDivElement>(null)

  const { register, handleSubmit, watch, setValue, unregister, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      claimDate: todayInputDate(),
      status: 'Pending',
      submissionMethod: 'Manual',
      serviceCode: '90837',
      clinician: 'Shannon',
      clientId: '',
      paymentDateReceived: '',
    },
  })

  const clinician = watch('clinician')
  const claimDate = watch('claimDate')
  const serviceCode = watch('serviceCode')
  const insurance = watch('insurance')
  const clientAmountRaw = watch('clientAmount')
  const submissionMethod = watch('submissionMethod')
  const clientIdValue = watch('clientId')
  const supplemental = watch('supplemental')
  const status = watch('status')

  const PAYMENT_DATE_STATUSES = ['Payment Received', 'Payment Pending', 'Deductible'] as const
  const showPaymentDate = PAYMENT_DATE_STATUSES.includes(status as typeof PAYMENT_DATE_STATUSES[number])
  const paymentDateRequired = status === 'Payment Received'

  const clientOptions = caseloads
    ?.filter(e => e.clinician === clinician)
    .map(e => e.clientId) ?? []

  const filteredOptions = comboQuery.length === 0
    ? []
    : clientOptions.filter(id => id.toLowerCase().includes(comboQuery.toLowerCase()))

  const isDiscontinuedCode = DISCONTINUED_CODES.includes(serviceCode) &&
    claimDate && new Date(claimDate) > DISCONTINUED_AFTER

  const isHHOCash = HHO_PAYERS.includes((insurance ?? '').toLowerCase()) &&
    (submissionMethod === 'Cash' || (watch('notes') ?? '').toLowerCase().includes('late cancellation'))

  const is90785Alone = serviceCode === '90785' && !showSupplemental

  const clientAmount = parseFloat(clientAmountRaw) || 0
  const stripeFees = clientAmount > 0 ? Math.round((clientAmount * 0.029 + 0.3) * 100) / 100 : 0

  const suppClientAmount = parseFloat(supplemental?.clientAmount ?? '0') || 0
  const suppStripeFees = suppClientAmount > 0 ? Math.round((suppClientAmount * 0.029 + 0.3) * 100) / 100 : 0

  useEffect(() => {
    const initial = watch('clientId')
    if (initial) setComboQuery(initial)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  useEffect(() => {
    if (!clientIdValue) {
      setAutoFilledFields(new Set())
      setInsuranceAmountSource(null)
      insuranceManualRef.current = false
      return
    }
    const filled = new Set<string>()

    const caseload = caseloads?.find(e => e.clientId === clientIdValue)
    if (caseload) {
      setValue('clinician', caseload.clinician as Clinician)
      filled.add('clinician')
    }

    const recent = [...(claims ?? [])]
      .filter(c => c.clientId === clientIdValue)
      .sort((a, b) => new Date(b.claimDate).getTime() - new Date(a.claimDate).getTime())[0]

    if (recent) {
      setValue('insurance', recent.insurance)
      filled.add('insurance')
      setValue('serviceCode', recent.serviceCode as FormValues['serviceCode'])
      filled.add('serviceCode')
      setValue('submissionMethod', recent.submissionMethod)
      filled.add('submissionMethod')
      setValue('clientAmount', String(recent.clientAmount))
      filled.add('clientAmount')
      // insuranceAmount is intentionally omitted here — the contract rate effect
      // will fill it (recalculating from the current rate minus client portion).
      // If no contract rate exists, fall back to the prior claim value below.
      if (!caseload) {
        setValue('clinician', recent.clinician as Clinician)
        filled.add('clinician')
      }
    }

    insuranceManualRef.current = false
    setAutoFilledFields(filled)
  }, [clientIdValue, caseloads, claims, setValue])

  // Contract rate auto-fill: fires whenever payer, code, or client amount changes.
  // Skipped if the user has manually edited the insurance amount field.
  // When a contract rate is found: insuranceAmount = max(0, allowable - clientAmount).
  // Falls back to the prior claim's insuranceAmount when no rate exists for this payer.
  useEffect(() => {
    if (insuranceManualRef.current) return

    const clientAmt = parseFloat(clientAmountRaw) || 0

    if (insurance && serviceCode) {
      const rate = lookupRate(insurance, serviceCode)
      if (rate !== null) {
        const insAmt = Math.max(0, rate - clientAmt)
        setValue('insuranceAmount', insAmt.toFixed(2))
        setInsuranceAmountSource('contract-rate')
        return
      }
    }

    // No contract rate — fall back to prior claim value if one was loaded
    const recent = [...(claims ?? [])]
      .filter(c => c.clientId === clientIdValue)
      .sort((a, b) => new Date(b.claimDate).getTime() - new Date(a.claimDate).getTime())[0]

    if (recent) {
      setValue('insuranceAmount', String(recent.insuranceAmount))
      setInsuranceAmountSource('prior-claim')
    } else {
      setInsuranceAmountSource(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insurance, serviceCode, clientAmountRaw, contractRateRows])

  const onSubmit = async (values: FormValues) => {
    setSuppError(null)
    try {
      const primaryResult = await mutatePrimary({
        claimDate: values.claimDate,
        clinician: values.clinician,
        clientId: values.clientId || undefined,
        insurance: values.insurance,
        claimId: values.claimId || undefined,
        serviceCode: values.serviceCode as NewClaimInput['serviceCode'],
        submissionMethod: values.submissionMethod as NewClaimInput['submissionMethod'],
        status: (values.status || 'Pending') as NewClaimInput['status'],
        clientAmount: values.clientAmount ? parseFloat(values.clientAmount) : 0,
        insuranceAmount: values.insuranceAmount ? parseFloat(values.insuranceAmount) : 0,
        paymentDateReceived: values.paymentDateReceived || undefined,
        notes: values.notes || undefined,
      })

      if (values.supplemental && showSupplemental) {
        try {
          await mutateSupplemental({
            claimDate: values.claimDate,
            clinician: values.clinician,
            clientId: values.clientId || undefined,
            insurance: values.insurance,
            claimId: values.supplemental.claimId || undefined,
            serviceCode: values.supplemental.serviceCode as NewClaimInput['serviceCode'],
            submissionMethod: values.submissionMethod as NewClaimInput['submissionMethod'],
            status: (values.status || 'Pending') as NewClaimInput['status'],
            clientAmount: parseFloat(values.supplemental.clientAmount) || 0,
            insuranceAmount: parseFloat(values.supplemental.insuranceAmount) || 0,
            paymentDateReceived: values.paymentDateReceived || undefined,
            notes: values.supplemental.notes || undefined,
          })
        } catch {
          setSuppError(`Primary claim saved (row ${primaryResult.rowIndex}). Supplemental entry failed — please retry or add it manually.`)
          return
        }
      }

      navigate('/claims', { state: { newRowIndex: primaryResult.rowIndex } })
    } catch {
      // Primary failure shown via isError + error from hook
    }
  }

  const labelClass = 'block text-xs font-medium text-muted font-ui mb-1.5'
  const inputClass = 'w-full h-9 rounded-lg border border-border bg-white px-3 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal transition-colors hover:border-border-strong'
  const inputAutoClass = (field: string) =>
    autoFilledFields.has(field) ? `${inputClass} bg-blue-50` : inputClass
  const errorClass = 'text-xs text-error mt-1 font-ui'
  const autoLabel = (field: string) =>
    autoFilledFields.has(field)
      ? <p className="text-xs text-blue-500 font-ui mt-0.5">Auto-filled</p>
      : null

  return (
    <div className="max-w-2xl">
      <Link
        to="/claims"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-teal font-body mb-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
      >
        <ArrowLeft size={16} />
        Back to Claims
      </Link>

      <PageHeader title="New Claim" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Claim Date *</label>
                <input type="date" {...register('claimDate', { required: 'Required' })} className={inputClass} />
                {errors.claimDate && <p className={errorClass}>{errors.claimDate.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Clinician *</label>
                <select {...register('clinician', { required: 'Required' })} className={inputAutoClass('clinician')}>
                  {CLINICIANS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {autoLabel('clinician')}
              </div>
            </div>

            <div>
              <label className={labelClass}>Client ID</label>
              <div ref={comboRef} className="relative">
                <input
                  type="text"
                  value={comboQuery}
                  onChange={e => {
                    const val = e.target.value
                    setComboQuery(val)
                    setValue('clientId', val)
                    if (val.length > 0) setComboOpen(true)
                    else setComboOpen(false)
                  }}
                  onPaste={e => {
                    const pasted = e.clipboardData.getData('text').trim()
                    setComboQuery(pasted)
                    setValue('clientId', pasted)
                    setComboOpen(true)
                    e.preventDefault()
                  }}
                  onFocus={() => { if (comboQuery.length > 0) setComboOpen(true) }}
                  className={inputClass}
                  placeholder="Start typing or paste a client ID…"
                  autoComplete="off"
                />
                {comboOpen && filteredOptions.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full bg-white border border-border rounded-lg shadow-md max-h-52 overflow-y-auto font-body text-sm">
                    {filteredOptions.map(id => (
                      <li
                        key={id}
                        className="px-3 py-2 cursor-pointer hover:bg-teal-pale text-ink"
                        onMouseDown={e => {
                          e.preventDefault()
                          setComboQuery(id)
                          setValue('clientId', id)
                          setComboOpen(false)
                        }}
                      >
                        {id}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-xs text-muted font-ui mt-1">Hashed token — never a real name</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Insurance / Payer *</label>
                <select {...register('insurance', { required: 'Required' })} className={inputAutoClass('insurance')}>
                  <option value="">Select payer…</option>
                  {KNOWN_PAYERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {errors.insurance && <p className={errorClass}>{errors.insurance.message}</p>}
                {autoLabel('insurance')}
              </div>
              <div>
                <label className={labelClass}>Claim ID</label>
                <input type="text" {...register('claimId')} className={inputClass} placeholder="SimplePractice claim ID" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Service Code *</label>
                <select {...register('serviceCode', { required: 'Required' })} className={inputAutoClass('serviceCode')}>
                  {SERVICE_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.serviceCode && <p className={errorClass}>{errors.serviceCode.message}</p>}
                {autoLabel('serviceCode')}
              </div>
              <div>
                <label className={labelClass}>Submission Method *</label>
                <select {...register('submissionMethod', { required: 'Required' })} className={inputAutoClass('submissionMethod')}>
                  {SUBMISSION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {autoLabel('submissionMethod')}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Status</label>
                <select {...register('status')} className={inputClass}>
                  {CLAIM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {showPaymentDate && (
                <div>
                  <label className={labelClass}>
                    Payment Date Received{paymentDateRequired ? ' *' : ''}
                  </label>
                  <input
                    type="date"
                    {...register('paymentDateReceived', {
                      required: paymentDateRequired ? 'Required for Payment Received' : false,
                    })}
                    className={inputClass}
                  />
                  {errors.paymentDateReceived && (
                    <p className={errorClass}>{errors.paymentDateReceived.message}</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Client Amount</label>
                <input type="number" step="0.01" min="0" {...register('clientAmount')} className={inputAutoClass('clientAmount')} placeholder="0.00" />
                {autoLabel('clientAmount')}
                {clientAmount > 0 && (
                  <p className="text-xs text-muted font-ui mt-1">
                    Stripe fee: {formatCurrency(stripeFees)} → Net: {formatCurrency(clientAmount - stripeFees)}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Insurance Amount</label>
                <input
                  type="number" step="0.01" min="0"
                  {...register('insuranceAmount', {
                    onChange: () => {
                      insuranceManualRef.current = true
                      setInsuranceAmountSource(null)
                    },
                  })}
                  className={
                    insuranceAmountSource === 'contract-rate'
                      ? `${inputClass} bg-teal-pale`
                      : insuranceAmountSource === 'prior-claim'
                        ? `${inputClass} bg-blue-50`
                        : inputClass
                  }
                  placeholder="0.00"
                />
                {insuranceAmountSource === 'contract-rate' && (
                  <p className="text-xs text-teal font-ui mt-0.5">Contract rate</p>
                )}
                {insuranceAmountSource === 'prior-claim' && (
                  <p className="text-xs text-blue-500 font-ui mt-0.5">Auto-filled</p>
                )}
              </div>
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-body text-ink resize-none focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal transition-colors hover:border-border-strong"
                placeholder="Optional…"
              />
            </div>

            {!showSupplemental && (
              <button
                type="button"
                onClick={() => {
                  setValue('supplemental', { serviceCode: '90785', claimId: '', clientAmount: '0.00', insuranceAmount: '0.00', notes: '' })
                  setShowSupplemental(true)
                }}
                className="text-sm text-teal hover:text-teal-mid font-ui transition-colors"
              >
                + Add supplemental code
              </button>
            )}

            {showSupplemental && (
              <Card className="border-border">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-muted uppercase tracking-wide font-ui">Supplemental Entry</span>
                  <button
                    type="button"
                    onClick={() => {
                      unregister('supplemental')
                      setShowSupplemental(false)
                    }}
                    className="text-xs text-muted hover:text-ink font-ui transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Service Code *</label>
                      <select {...register('supplemental.serviceCode')} className={inputClass}>
                        {SERVICE_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Claim ID (supplemental)</label>
                      <input type="text" {...register('supplemental.claimId')} className={inputClass} placeholder="SimplePractice claim ID" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Client Amount</label>
                      <input type="number" step="0.01" min="0" {...register('supplemental.clientAmount')} className={inputClass} placeholder="0.00" />
                      {suppClientAmount > 0 && (
                        <p className="text-xs text-muted font-ui mt-1">
                          Stripe fee: {formatCurrency(suppStripeFees)} → Net: {formatCurrency(suppClientAmount - suppStripeFees)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Insurance Amount</label>
                      <input type="number" step="0.01" min="0" {...register('supplemental.insuranceAmount')} className={inputClass} placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Notes</label>
                    <textarea
                      {...register('supplemental.notes')}
                      rows={2}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-body text-ink resize-none focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal transition-colors hover:border-border-strong"
                      placeholder="Optional…"
                    />
                  </div>
                </div>
              </Card>
            )}

            {isDiscontinuedCode && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm font-body text-amber-800">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                {serviceCode} was discontinued after 1/15/2026. Verify this is intentional.
              </div>
            )}
            {isHHOCash && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm font-body text-amber-800">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                Health Options (Medicaid) clients cannot be charged no-show fees.
              </div>
            )}
            {is90785Alone && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm font-body text-amber-800">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                90785 is an add-on code and cannot be billed alone. Use "+ Add supplemental code" to pair it with a primary service.
              </div>
            )}

            {isError && <ErrorBanner message={(error as Error).message} />}
            {suppError && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800 font-body">
                <AlertTriangle size={15} className="shrink-0" />
                {suppError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Link to="/claims">
                <Button variant="secondary" type="button">Cancel</Button>
              </Link>
              <Button type="submit" loading={primaryPending || suppPending}>
                {primaryPending || suppPending ? 'Saving…' : showSupplemental ? 'Save Both Claims' : 'Save Claim'}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  )
}
