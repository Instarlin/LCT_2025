import { PanelLeftClose, Plus, Search } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatShortDate } from '@/lib/format'
import type { HistoryItem } from '@/types/workspace'
import { cn } from '@/lib/utils'

export type HistorySidebarProps = {
  filteredItems: HistoryItem[]
  pathologyOptions: string[]
  historySearch: string
  onHistorySearchChange: (value: string) => void
  selectedPathology?: string
  onSelectPathology: (value: string | undefined) => void
  onSelectStudy: (id: string) => void
  activeStudyId?: string
  onResetWorkspace: () => void
  onToggleCollapse: () => void
  collapsed: boolean
  username?: string | null
  onLogout: () => void
  isLoading?: boolean
  error?: string | null
}

const getDisplayTitle = (raw: string) => {
  const trimmed = raw.trim()
  return trimmed.length > 26 ? `${trimmed.slice(0, 23)}...` : trimmed
}

export const HistorySidebar = ({
  filteredItems,
  pathologyOptions,
  historySearch,
  onHistorySearchChange,
  selectedPathology,
  onSelectPathology,
  onSelectStudy,
  activeStudyId,
  onResetWorkspace,
  onToggleCollapse,
  collapsed,
  username,
  onLogout,
  isLoading = false,
  error,
}: HistorySidebarProps) => (
  <div
    className={cn(
      'relative h-full shrink-0 overflow-visible transition-[width] duration-300 ease-in-out',
      collapsed ? 'w-0 min-w-0' : 'w-[320px]'
    )}
  >
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onToggleCollapse}
      className={cn(
        'absolute top-4 -right-4 z-30 hover:cursor-pointer flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-all duration-300',
        collapsed ? 'translate-x-full rotate-180' : 'translate-x-0 rotate-0'
      )}
      aria-label={collapsed ? 'Показать список исследований' : 'Скрыть список исследований'}
    >
      <PanelLeftClose className="size-4 transition-transform duration-300" />
    </Button>
    <aside
      className={cn(
        'absolute inset-y-0 left-0 flex h-full w-[320px] flex-col gap-4 border-r border-slate-200/70 bg-white/80 p-4 shadow-[20px_0_60px_rgba(15,42,89,0.06)] backdrop-blur-xl transition-all duration-300',
        collapsed
          ? '-translate-x-full opacity-0 pointer-events-none'
          : 'translate-x-0 opacity-100 pointer-events-auto'
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-slate-700">Исследования</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input
          type="search"
          placeholder="Название / Дата / ID"
          value={historySearch}
          onChange={(event) => onHistorySearchChange(event.target.value)}
          className="border border-slate-200 bg-white/90 pl-9 text-sm selection:bg-slate-100 selection:text-slate-900 hover:cursor-pointer hover:border-slate-400 hover:shadow-sm hover:shadow-slate-300"
        />
      </div>

      <Select
        value={selectedPathology}
        onValueChange={(value) => onSelectPathology(value === '__all' ? undefined : value)}
      >
        <SelectTrigger className="w-full justify-between rounded-xl border border-slate-200 bg-white/90 text-sm text-slate-900 shadow-inner hover:cursor-pointer hover:border-slate-400 hover:shadow-sm hover:shadow-slate-300">
          <SelectValue placeholder="Фильтр по патологии" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border border-slate-200 bg-white shadow-xl">
          <SelectItem className="hover:cursor-pointer hover:bg-slate-100" value="__all">
            Все патологии
          </SelectItem>
          {pathologyOptions.map((option) => (
            <SelectItem className="hover:cursor-pointer hover:bg-slate-100" key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 py-4 shadow-xs transition-all hover:cursor-pointer hover:border-slate-400 hover:shadow-sm hover:shadow-slate-300"
            onClick={onResetWorkspace}
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>Добавить исследование</span>
          </Button>
          <div className="flex flex-col gap-3">
            {isLoading && (
              <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-6 text-center text-sm text-slate-500">
                Загружаем список исследований…
              </div>
            )}
            {!isLoading && error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-600">
                {error}
              </div>
            )}
            {!isLoading && !error && filteredItems.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Нет доступных исследований
              </div>
            )}
            {!isLoading && !error &&
              filteredItems.map((item) => {
                const displayTitle = getDisplayTitle(item.title ?? item.id)
                const primaryPathology =
                  item.pathologies.length > 0
                    ? item.pathologies.reduce((best, current) =>
                        current.probability > best.probability ? current : best,
                      item.pathologies[0])
                    : null
                const isActive = item.id === activeStudyId
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectStudy(item.id)}
                    className={`flex h-[72px] flex-col justify-between rounded-xl border px-4 py-3 text-left shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      isActive
                        ? 'border-sky-200 bg-sky-50 text-slate-800'
                        : 'border-slate-200 bg-white/90 hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-sm hover:shadow-slate-300'
                    }`}
                    aria-pressed={isActive ? 'true' : 'false'}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`truncate text-sm font-semibold ${isActive ? 'text-slate-800' : 'text-slate-700'}`}>
                        {displayTitle}
                      </span>
                    </div>
                    <div className={`flex items-center justify-between text-xs ${isActive ? 'text-slate-600' : 'text-slate-500'}`}>
                      <span className="max-w-[68%] truncate">{primaryPathology?.label ?? '—'}</span>
                      <time className="font-mono" dateTime={item.studyDate}>
                        {formatShortDate(item.studyDate)}
                      </time>
                    </div>
                  </button>
                )
              })}
          </div>
        </div>
      </ScrollArea>
    </aside>
    <div
      className={cn(
        'absolute bottom-6 left-4 right-4 flex flex-col items-stretch gap-2 transition-all duration-300',
        collapsed
          ? 'translate-y-4 opacity-0 pointer-events-none'
          : 'translate-y-0 opacity-100 pointer-events-auto'
      )}
    >
      <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-sm text-slate-600 shadow-sm sm:flex">
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
        <span>Вошли как {username ?? '—'}</span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onLogout}
        className={cn(
          'flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md'
        )}
      >
        Выйти
      </Button>
    </div>
  </div>
)
