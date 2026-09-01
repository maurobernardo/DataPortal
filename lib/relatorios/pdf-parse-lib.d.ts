declare module 'pdf-parse/lib/pdf-parse.js' {
  export type ResultadoPdfParse = {
    numpages: number
    numrender: number
    info: unknown
    metadata: unknown
    text: string
    version: string
  }
  export default function pdf(
    dataBuffer: Buffer,
    options?: { pagerender?: (pageData: any) => Promise<string> | string; max?: number; version?: string }
  ): Promise<ResultadoPdfParse>
}
