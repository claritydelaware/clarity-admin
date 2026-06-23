interface Props {
  colSpan: number
  label: string
  value: string
}

export default function BoardSummaryRow({ colSpan, label, value }: Props) {
  return (
    <tr role="row" className="bg-surface-sunken/60 border-t border-border">
      <td colSpan={colSpan} className="px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-ui font-medium text-muted uppercase tracking-wide">{label}</span>
          <span className="text-sm font-heading font-semibold text-ink tabular-nums">{value}</span>
        </div>
      </td>
    </tr>
  )
}
