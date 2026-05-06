declare module 'busboy' {
  import type { IncomingHttpHeaders } from 'http'
  import type { Readable } from 'stream'

  type BusboyConfig = {
    headers: IncomingHttpHeaders
    limits?: {
      fileSize?: number
      files?: number
      fields?: number
    }
  }

  type FileInfo = {
    filename: string
    encoding: string
    mimeType: string
  }

  type FieldInfo = {
    nameTruncated: boolean
    valueTruncated: boolean
    encoding: string
    mimeType: string
  }

  type BusboyInstance = {
    on(event: 'field', listener: (name: string, value: string, info: FieldInfo) => void): BusboyInstance
    on(event: 'file', listener: (name: string, stream: Readable, info: FileInfo) => void): BusboyInstance
    on(event: 'error', listener: (error: Error) => void): BusboyInstance
    on(event: 'finish', listener: () => void): BusboyInstance
  }

  export default function busboy(config: BusboyConfig): BusboyInstance
}
