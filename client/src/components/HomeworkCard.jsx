import { Link } from 'react-router-dom'

const typeColors = { text: 'bg-blue-100 text-blue-800', pdf: 'bg-purple-100 text-purple-800', quiz: 'bg-green-100 text-green-800' }

export default function HomeworkCard({ hw }) {
  const due = new Date(hw.due_date)
  const overdue = due < new Date()
  return (
    <Link to={`/homework/${hw.id}`} className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-textMain truncate">{hw.title}</h3>
          <p className="text-sm text-muted mt-1 line-clamp-2">{hw.description}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${typeColors[hw.type] || 'bg-gray-100 text-gray-700'}`}>{hw.type.toUpperCase()}</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>Due: <span className={overdue ? 'text-danger font-medium' : ''}>{due.toLocaleDateString('en-IN')}</span></span>
        {hw.submitted && <span className="text-success font-medium">&#10003; Submitted</span>}
      </div>
    </Link>
  )
}
