import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

export default function PDFViewer({ url }) {
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [error, setError] = useState(null)

  if (!url) return <div className="p-4 text-muted">No PDF available.</div>

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-50 rounded-xl select-none" onContextMenu={(e) => e.preventDefault()}>
      {error ? (
        <div className="text-danger text-sm">{error}</div>
      ) : (
        <>
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={() => setError('Failed to load PDF. The link may have expired.')}
            className="shadow-lg"
          >
            <Page pageNumber={pageNumber} width={Math.min(window.innerWidth - 48, 600)} />
          </Document>
          {numPages && (
            <div className="flex items-center gap-4 text-sm text-muted">
              <button onClick={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="px-3 py-1 bg-white border rounded-lg disabled:opacity-40">Prev</button>
              <span>Page {pageNumber} of {numPages}</span>
              <button onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages} className="px-3 py-1 bg-white border rounded-lg disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
