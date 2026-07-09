import { jsPDF } from "jspdf";

export interface Attachment {
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface Entry {
  _id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  attachments: Attachment[];
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  customType?: string;
  format?: "note" | "files";
}

interface DocBlock {
  type: "text" | "heading" | "list-item" | "code" | "hr";
  text: string;
  level?: number;
}

// Convert bytes to readable sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Helper to clean inline markdown syntax characters like **, *, _, `, ~~
function cleanInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold
    .replace(/\*([^*]+)\*/g, "$1")     // Italic
    .replace(/_([^_]+)_/g, "$1")       // Italic
    .replace(/`([^`]+)`/g, "$1")       // Inline code
    .replace(/~~([^~]+)~~/g, "$1");    // Strikethrough
}

// Parse markdown to list of document blocks
function parseMarkdownToBlocks(markdown: string): DocBlock[] {
  if (!markdown) return [];

  const lines = markdown.split(/\r?\n/);
  const blocks: DocBlock[] = [];
  
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks toggle
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // End of code block
        blocks.push({
          type: "code",
          text: codeLines.join("\n"),
        });
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Horizontal Rules
    if (line.trim() === "---" || line.trim() === "***" || line.trim() === "___") {
      blocks.push({ type: "hr", text: "" });
      continue;
    }

    // Headings (H1 - H4)
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: cleanInlineMarkdown(headingMatch[2]),
      });
      continue;
    }

    // Bullet List Items (including task lists)
    const listMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (listMatch) {
      const content = listMatch[2];
      blocks.push({
        type: "list-item",
        text: cleanInlineMarkdown(content),
      });
      continue;
    }

    // Numbered list items
    const numListMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (numListMatch) {
      blocks.push({
        type: "list-item",
        text: cleanInlineMarkdown(numListMatch[2]),
      });
      continue;
    }

    // Paragraph (regular text)
    if (line.trim()) {
      blocks.push({
        type: "text",
        text: cleanInlineMarkdown(line),
      });
    }
  }

  return blocks;
}

// Parse HTML tags as a fallback (for legacy HTML documents)
function parseHtmlToTextBlocks(html: string): DocBlock[] {
  if (!html) return [];
  
  const blocks: DocBlock[] = [];
  
  let cleaned = html
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
    
  const blockRegex = /<(p|h1|h2|h3|h4|li|pre|code|hr)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  
  while ((match = blockRegex.exec(cleaned)) !== null) {
    const tag = match[1].toLowerCase();
    const content = match[2]
      .replace(/<[^>]*>/g, "")
      .trim();
      
    if (tag === "hr") {
      blocks.push({ type: "hr", text: "" });
    } else if (tag.startsWith("h")) {
      const level = parseInt(tag.charAt(1)) || 1;
      blocks.push({ type: "heading", level, text: content });
    } else if (tag === "li") {
      blocks.push({ type: "list-item", text: content });
    } else if (tag === "pre" || tag === "code") {
      blocks.push({ type: "code", text: content });
    } else if (content) {
      blocks.push({ type: "text", text: content });
    }
  }
  
  if (blocks.length === 0) {
    const plain = cleaned.replace(/<[^>]*>/g, "").trim();
    if (plain) {
      plain.split("\n").forEach((line) => {
        if (line.trim()) {
          blocks.push({ type: "text", text: line.trim() });
        }
      });
    }
  }
  
  return blocks;
}

export function exportEntryToPDF(entry: Entry, categoryName: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2; // 170mm
  
  let y = margin;

  // Helper to check page bounds and insert new page if overflow
  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      
      // Header details on subsequent pages
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Exported from NexDocsHub: ${entry.title}`, margin, 10);
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, 12, pageWidth - margin, 12);
      
      y = margin + 5;
    }
  };

  // 1. Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  const titleLines = doc.splitTextToSize(entry.title, contentWidth);
  ensureSpace(titleLines.length * 8 + 5);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 5;

  // 2. Divider line
  ensureSpace(2);
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // 3. Metadata block
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  
  const createdDate = new Date(entry.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  
  const typeLabel =
    entry.customType ||
    entry.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  
  ensureSpace(5);
  doc.text(`Category: ${categoryName}  |  Type: ${typeLabel}`, margin, y);
  y += 5;
  ensureSpace(5);
  doc.text(`Created: ${createdDate}`, margin, y);
  y += 7;

  // 4. Tags
  if (entry.tags && entry.tags.length > 0) {
    ensureSpace(6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("Tags: ", margin, y);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    const tagsString = entry.tags.join(", ");
    const tagsLines = doc.splitTextToSize(tagsString, contentWidth - 12);
    doc.text(tagsLines, margin + 11, y);
    y += tagsLines.length * 5 + 6;
  }

  // 5. Divider line
  ensureSpace(2);
  doc.setDrawColor(240, 240, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // 6. Content Section
  if (entry.format === "files") {
    // Vault Document
    ensureSpace(7);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "This entry is a Document Vault containing files only. Content preview is not available.",
      margin,
      y
    );
    y += 12;
  } else if (entry.content) {
    const isHtml = entry.content.trim().startsWith("<");
    const blocks = isHtml 
      ? parseHtmlToTextBlocks(entry.content) 
      : parseMarkdownToBlocks(entry.content);
    
    blocks.forEach((block) => {
      if (block.type === "hr") {
        ensureSpace(6);
        doc.setDrawColor(240, 240, 240);
        doc.line(margin, y + 2, pageWidth - margin, y + 2);
        y += 6;
      } else if (block.type === "heading") {
        const level = block.level || 1;
        const fontSize = level === 1 ? 16 : level === 2 ? 14 : level === 3 ? 12.5 : 11;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(fontSize);
        doc.setTextColor(30, 30, 30);
        
        const headingLines = doc.splitTextToSize(block.text, contentWidth);
        ensureSpace(headingLines.length * 6 + 4);
        doc.text(headingLines, margin, y);
        y += headingLines.length * 6 + 4;
      } else if (block.type === "list-item") {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        
        const bulletText = `•  ${block.text}`;
        const itemLines = doc.splitTextToSize(bulletText, contentWidth - 5);
        ensureSpace(itemLines.length * 5 + 2);
        doc.text(itemLines, margin + 4, y);
        y += itemLines.length * 5 + 2;
      } else if (block.type === "code") {
        doc.setFont("courier", "normal");
        doc.setFontSize(9);
        doc.setTextColor(70, 70, 70);
        
        const codeLines = doc.splitTextToSize(block.text, contentWidth - 8);
        ensureSpace(codeLines.length * 4.5 + 4);
        
        // Code block light-gray container
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, y - 3, contentWidth, codeLines.length * 4.5 + 3, "F");
        
        doc.text(codeLines, margin + 4, y);
        y += codeLines.length * 4.5 + 4;
      } else {
        // Plain text paragraph
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(50, 50, 50);
        
        const textLines = doc.splitTextToSize(block.text, contentWidth);
        ensureSpace(textLines.length * 5.2 + 3);
        doc.text(textLines, margin, y);
        y += textLines.length * 5.2 + 3;
      }
    });
    y += 5;
  }

  // 7. Attachments Section
  if (entry.attachments && entry.attachments.length > 0) {
    ensureSpace(15);
    
    // Header for attachments
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text("Attachments (Cloud Storage Links)", margin, y);
    y += 5;
    
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    entry.attachments.forEach((file) => {
      ensureSpace(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(40, 40, 40);
      doc.text(file.name, margin, y);
      y += 4.5;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(110, 110, 110);
      doc.text(
        `Size: ${formatFileSize(file.size)}  |  Type: ${file.mimeType}`,
        margin,
        y
      );
      y += 4.5;
      
      // Clickable URL in PDF
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(43, 108, 176); // Standard link blue
      
      const linkText = "Download File Link";
      doc.text(linkText, margin, y);
      
      doc.link(margin, y - 3, 30, 4.5, { url: file.url });
      y += 6.5;
    });
  }

  // Save document
  const sanitizedTitle = entry.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  
  doc.save(`${sanitizedTitle || "document"}.pdf`);
}
