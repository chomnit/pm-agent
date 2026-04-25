import PDFDocument from 'pdfkit'
import { marked, Token } from 'marked'
import type { Response } from 'express'

const PAGE_MARGIN = 60
const PAGE_WIDTH = 595.28 // A4

function sanitize(text: string): string {
  return text.replace(/\r/g, '')
}

function renderTokens(doc: InstanceType<typeof PDFDocument>, tokens: Token[]): void {
  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        const sizes: Record<number, number> = { 1: 22, 2: 17, 3: 13 }
        const size = sizes[token.depth] ?? 11
        doc.moveDown(token.depth === 1 ? 0.8 : 0.5)
        doc
          .font('Helvetica-Bold')
          .fontSize(size)
          .text(sanitize(token.text), { width: PAGE_WIDTH - PAGE_MARGIN * 2 })
        doc.moveDown(0.25)
        doc.font('Helvetica').fontSize(11)
        break
      }

      case 'paragraph': {
        // Inline content — strip basic markdown bold/italic markers for plain text
        const plain = sanitize(token.text).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1')
        doc
          .font('Helvetica')
          .fontSize(11)
          .text(plain, { width: PAGE_WIDTH - PAGE_MARGIN * 2, lineGap: 2 })
        doc.moveDown(0.4)
        break
      }

      case 'list': {
        for (let i = 0; i < token.items.length; i++) {
          const item = token.items[i]
          const bullet = token.ordered ? `${i + 1}.` : '•'
          const plain = sanitize(item.text).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1')
          doc
            .font('Helvetica')
            .fontSize(11)
            .text(`${bullet}  ${plain}`, {
              indent: 16,
              width: PAGE_WIDTH - PAGE_MARGIN * 2 - 16,
              lineGap: 1
            })
        }
        doc.moveDown(0.4)
        break
      }

      case 'code': {
        const codeText = sanitize(token.text)
        const textWidth = PAGE_WIDTH - PAGE_MARGIN * 2
        // Estimate box height: ~14pt per line
        const lineCount = codeText.split('\n').length
        const boxHeight = lineCount * 14 + 16
        const startX = PAGE_MARGIN
        const startY = doc.y

        // Draw light gray background
        doc
          .save()
          .rect(startX, startY, textWidth, boxHeight)
          .fill('#F4F4F4')
          .restore()

        doc
          .font('Courier')
          .fontSize(9)
          .fillColor('#333333')
          .text(codeText, startX + 8, startY + 8, { width: textWidth - 16, lineGap: 2 })

        doc.font('Helvetica').fontSize(11).fillColor('#000000')
        doc.moveDown(0.5)
        break
      }

      case 'table': {
        // Render as simple plain-text table lines
        doc.font('Courier').fontSize(9)
        const header = token.header.map((h: { text: string }) => h.text).join(' | ')
        doc.text(header, { width: PAGE_WIDTH - PAGE_MARGIN * 2 })
        doc.text('─'.repeat(Math.min(80, header.length)))
        for (const row of token.rows) {
          doc.text(row.map((c: { text: string }) => c.text).join(' | '), { width: PAGE_WIDTH - PAGE_MARGIN * 2 })
        }
        doc.font('Helvetica').fontSize(11)
        doc.moveDown(0.5)
        break
      }

      case 'blockquote': {
        if ('tokens' in token && Array.isArray(token.tokens)) {
          doc
            .save()
            .rect(PAGE_MARGIN, doc.y, 3, 20)
            .fill('#CCCCCC')
            .restore()
          doc
            .font('Helvetica-Oblique')
            .fontSize(10)
            .text('', PAGE_MARGIN + 12, doc.y)
          renderTokens(doc, token.tokens as Token[])
          doc.font('Helvetica').fontSize(11)
        }
        break
      }

      case 'hr': {
        doc.moveDown(0.3)
        doc
          .save()
          .moveTo(PAGE_MARGIN, doc.y)
          .lineTo(PAGE_WIDTH - PAGE_MARGIN, doc.y)
          .strokeColor('#DDDDDD')
          .lineWidth(0.5)
          .stroke()
          .restore()
        doc.moveDown(0.5)
        break
      }

      case 'space': {
        doc.moveDown(0.3)
        break
      }

      default:
        break
    }
  }
}

export function markdownToPdf(content: string, title: string, res: Response): void {
  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${title}.pdf"`)

  doc.pipe(res)

  // Cover title
  doc
    .font('Helvetica-Bold')
    .fontSize(24)
    .text(title, { align: 'left' })
  doc.moveDown(0.2)
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#888888')
    .text(`Product Description Document  ·  Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`)
  doc.fillColor('#000000')
  doc.moveDown(0.5)
  doc
    .save()
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(PAGE_WIDTH - PAGE_MARGIN, doc.y)
    .strokeColor('#CCCCCC')
    .lineWidth(0.75)
    .stroke()
    .restore()
  doc.moveDown(1)

  const tokens = marked.lexer(content)
  renderTokens(doc, tokens)

  doc.end()
}
