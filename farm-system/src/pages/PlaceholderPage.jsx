export default function PlaceholderPage({ title }) {
  return (
    <div className="card p-10 text-center text-gray-400">
      <div className="text-4xl mb-3">🚧</div>
      <p className="font-medium text-gray-600">{title}</p>
      <p className="text-sm mt-1">此功能於下一階段開發</p>
    </div>
  )
}
