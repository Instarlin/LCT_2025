import JSZip from 'jszip'

const DICOM_HEADER_OFFSET = 128
const DICOM_PREFIX = 'DICM'

export type DicomFile = {
  name: string
  file: File
}

const isLikelyDicom = (buffer: ArrayBuffer, filename: string): boolean => {
  const lowerName = filename.toLowerCase()
  if (lowerName.endsWith('.dcm') || lowerName.endsWith('.dicom')) {
    return true
  }

  if (buffer.byteLength <= DICOM_HEADER_OFFSET + DICOM_PREFIX.length) {
    return false
  }

  const view = new Uint8Array(buffer, DICOM_HEADER_OFFSET, DICOM_PREFIX.length)
  let prefix = ''
  for (let i = 0; i < view.length; i += 1) {
    prefix += String.fromCharCode(view[i])
  }
  return prefix === DICOM_PREFIX
}

const normaliseEntryName = (rawName: string): string => {
  const parts = rawName.split('/').filter(Boolean)
  const tail = parts.at(-1) ?? rawName
  return tail || 'untitled.dcm'
}

const loadZip = async (file: File): Promise<DicomFile[]> => {
  const zip = await JSZip.loadAsync(file)
  const entries = Object.values(zip.files)
  const dicomFiles: DicomFile[] = []

  for (const entry of entries) {
    if (entry.dir) continue
    const filename = normaliseEntryName(entry.name)
    const buffer = await entry.async('arraybuffer')
    if (!isLikelyDicom(buffer, filename)) continue
    const dicomFile = new File([buffer], filename, { type: 'application/dicom' })
    dicomFiles.push({ name: filename, file: dicomFile })
  }

  return dicomFiles
}

export const extractDicomFiles = async (files: File[]): Promise<DicomFile[]> => {
  const results: DicomFile[] = []

  for (const file of files) {
    const lowerName = file.name.toLowerCase()
    if (lowerName.endsWith('.zip')) {
      const extracted = await loadZip(file)
      results.push(...extracted)
      continue
    }

    const buffer = await file.arrayBuffer()
    if (!isLikelyDicom(buffer, file.name)) {
      continue
    }
    const normalizedName = normaliseEntryName(file.name)
    const dicomFile = new File([buffer], normalizedName, { type: 'application/dicom' })
    results.push({ name: normalizedName, file: dicomFile })
  }

  return results
}
