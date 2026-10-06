import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../../db/db'
import type { Template } from '../../db/types'
import { duplicateTemplate } from './editorLogic'

export default function TemplatesScreen() {
  const templates = useLiveQuery(
    async () => (await db.templates.toArray()).sort((a, b) => a.createdAt - b.createdAt),
    [],
  )

  async function duplicate(t: Template) {
    await db.templates.add(duplicateTemplate(t))
  }

  async function remove(t: Template) {
    if (!window.confirm(`Delete "${t.name}"? Past workouts keep their history.`)) return
    await db.templates.delete(t.id)
  }

  const small = 'min-h-11 rounded-lg bg-neutral-800 px-4 text-sm font-medium active:bg-neutral-700'

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Workout</h1>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Templates
      </h2>

      <ul className="flex flex-col gap-3">
        {templates?.map((t) => (
          <li key={t.id} className="rounded-xl bg-neutral-900 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-lg font-semibold">{t.name}</h3>
              <span className="shrink-0 text-sm text-neutral-500">
                {t.exercises.length} exercises
              </span>
            </div>
            {t.note && (
              <p className="mt-1 line-clamp-1 text-sm text-neutral-500">{t.note.split('\n')[0]}</p>
            )}
            <div className="mt-3 flex gap-2">
              <Link to={`/templates/${t.id}`} className={`${small} flex items-center`}>
                Edit
              </Link>
              <button className={small} onClick={() => duplicate(t)}>
                Duplicate
              </button>
              <button className={`${small} text-red-400`} onClick={() => remove(t)}>
                Delete
              </button>
            </div>
          </li>
        ))}
        {templates && templates.length === 0 && (
          <li className="rounded-xl bg-neutral-900 p-6 text-center text-neutral-500">
            No templates yet. Create your first one below.
          </li>
        )}
      </ul>

      <Link
        to="/templates/new"
        className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-emerald-500 font-semibold text-black"
      >
        + New template
      </Link>
    </div>
  )
}
