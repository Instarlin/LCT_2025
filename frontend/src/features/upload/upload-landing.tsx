import { useState } from 'react'
import type { Accept, FileRejection } from 'react-dropzone'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { UploadCloud } from 'lucide-react'

const DEFAULT_ACCEPT: Accept = {
  'application/dicom': ['.dcm'],
  'application/zip': ['.zip'],
}

type UploadLandingProps = {
  onFilesAccepted: (files: File[]) => void
  anonymize: boolean
  onToggleAnonymize: (value: boolean) => void
  accept?: Accept
}

export const UploadLanding = ({
  onFilesAccepted,
  anonymize,
  onToggleAnonymize,
  accept = DEFAULT_ACCEPT,
}: UploadLandingProps) => {
  const [rejections, setRejections] = useState<FileRejection[]>([])

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } = useDropzone({
    accept,
    multiple: true,
    noClick: true,
    noKeyboard: true,
    onDropAccepted: (acceptedFiles) => {
      setRejections([])
      onFilesAccepted(acceptedFiles)
    },
    onDropRejected: (fileRejections) => {
      setRejections(fileRejections)
    },
  })

  const dropzoneStyles = cn(
    'flex flex-1 w-full flex-col items-center justify-center text-center transition-colors',
    isDragActive ? 'border-sky-400 bg-sky-50/60' : 'border-slate-200 bg-white',
    isDragReject ? 'border-rose-400 bg-rose-50/80' : '',
  )

  const rootProps = getRootProps({
    className: dropzoneStyles,
  })

  return (
    <section className="flex flex-1 flex-col items-center gap-6">
      <div {...rootProps}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <p className="text-xl font-semibold text-slate-900">
            {isDragReject ? 'Неподдерживаемый формат' : 'Перетащите сюда DICOM или ZIP'}
          </p>
          <p className="text-sm text-slate-500">
            {isDragActive
              ? 'Отпустите файлы, чтобы добавить их'
              : 'или воспользуйтесь кнопкой ниже'}
          </p>
          <Button
            type="button"
            className={"rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-cyan-400 px-5 py-2 font-semibold text-white shadow-xs transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-300"}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              open()
            }}  
          >
            <UploadCloud className="size-4" aria-hidden="true" />
            <span>Загрузить файлы / ZIP</span>
          </Button>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Checkbox
              id="anon-toggle"
              checked={anonymize}
              onCheckedChange={(checked) => onToggleAnonymize(Boolean(checked))}
              className="size-4"
            />
            <label htmlFor="anon-toggle" className="cursor-pointer select-none text-slate-900">
              Анонимизировать (обнулить базовые теги)
            </label>
          </div>
        </div>
      </div>



      {rejections.length > 0 && (
        <div className="w-full max-w-xl rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-left text-sm text-rose-600">
          <p className="font-semibold">Не удалось добавить файлы:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {rejections.map((rejection) => (
              <li key={rejection.file.name}>
                {rejection.file.name}
                {rejection.errors.length > 0 && (
                  <span className="ml-1 text-xs text-rose-500">
                    — {rejection.errors[0].message}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
