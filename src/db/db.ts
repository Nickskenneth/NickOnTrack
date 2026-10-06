import Dexie, { type EntityTable } from 'dexie'
import type { Exercise, MetaRow, Session, Settings, Template } from './types'

export class NickOnTrackDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  templates!: EntityTable<Template, 'id'>
  sessions!: EntityTable<Session, 'id'>
  settings!: EntityTable<Settings, 'id'>
  meta!: EntityTable<MetaRow, 'key'>

  constructor(name = 'nickontrack') {
    super(name)
    // Add a new version(n) block for every schema change; never edit old ones.
    this.version(1).stores({
      exercises: 'id, name',
      templates: 'id, name',
      sessions: 'id, startedAt, templateId, finishedAt',
      settings: 'id',
      meta: 'key',
    })
  }
}

export const db = new NickOnTrackDB()

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  units: 'kg',
  soundOn: true,
  defaultRestSeconds: 90,
}
