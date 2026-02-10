export function ReadOnlyBanner() {
  return (
    <div className="border border-red-200 bg-red-50 text-red-800 text-sm font-semibold px-4 py-3 rounded">
      【严格 Read-only】不写入数据 / 不触发 Execution / 无自动反馈 / 仅供人工审阅
    </div>
  )
}
