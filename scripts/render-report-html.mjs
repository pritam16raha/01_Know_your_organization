import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const inputPath = resolve(process.argv[2] ?? "REPORT.md");
const outputPath = resolve(process.argv[3] ?? ".report-preview.html");
const markdown = await readFile(inputPath, "utf8");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inline(markdownText) {
  const tokens = [];
  const protect = (html) => {
    const token = `@@HTML_TOKEN_${tokens.length}@@`;
    tokens.push(html);
    return token;
  };

  let value = markdownText
    .replace(/`([^`]+)`/g, (_match, code) => protect(`<code>${escapeHtml(code)}</code>`))
    .replace(/<((?:https?:\/\/)[^>]+)>/g, (_match, url) =>
      protect(`<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`),
    )
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, label, url) =>
      protect(`<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`),
    );

  value = escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return value.replace(/@@HTML_TOKEN_(\d+)@@/g, (_match, index) => tokens[Number(index)]);
}

function tableCells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableDivider(line) {
  return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);
}

function markdownToHtml(source) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```([\w-]*)\s*$/);
    if (fence) {
      const language = fence[1] || "text";
      const code = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(
        `<div class="code-block"><div class="code-label">${escapeHtml(language)}</div><pre><code>${escapeHtml(code.join("\n"))}</code></pre></div>`,
      );
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const appendixClass = level === 1 && heading[2].startsWith("Appendix")
        ? ' id="appendix-a" class="appendix-title"'
        : "";
      blocks.push(`<h${level}${appendixClass}>${inline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push("<hr>");
      index += 1;
      continue;
    }

    if (
      line.trim().startsWith("|") &&
      index + 1 < lines.length &&
      isTableDivider(lines[index + 1])
    ) {
      const headers = tableCells(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      blocks.push(
        `<table><thead><tr>${headers.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead>` +
          `<tbody>${rows
            .map(
              (row) =>
                `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`,
            )
            .join("")}</tbody></table>`,
      );
      continue;
    }

    const unordered = line.match(/^\s*-\s+(.+)$/);
    if (unordered) {
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*-\s+(.+)$/);
        if (!item) break;
        items.push(`<li>${inline(item[1])}</li>`);
        index += 1;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ordered) {
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*\d+\.\s+(.+)$/);
        if (!item) break;
        items.push(`<li>${inline(item[1])}</li>`);
        index += 1;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !/^```/.test(lines[index]) &&
      !/^---+$/.test(lines[index].trim()) &&
      !/^\s*-\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index]) &&
      !(lines[index].trim().startsWith("|") && isTableDivider(lines[index + 1] ?? ""))
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(`<p>${inline(paragraph.join(" "))}</p>`);
  }

  return blocks.join("\n");
}

const body = markdownToHtml(markdown);
const title = markdown.match(/^#\s+(.+)$/m)?.[1] ?? "Assessment Report";
const generatedAt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeZone: "Asia/Kolkata",
}).format(new Date());

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 13mm 14mm 15mm; }
    * { box-sizing: border-box; }
    html { color: #111827; font-family: "Segoe UI", Arial, sans-serif; font-size: 9.4pt; line-height: 1.38; }
    body { margin: 0 auto; max-width: 182mm; }
    h1 { color: #111827; font-size: 20pt; line-height: 1.15; margin: 0 0 5mm; letter-spacing: -0.35px; }
    h2 { border-bottom: 1px solid #d9deea; color: #1e293b; font-size: 13.2pt; line-height: 1.2; margin: 6mm 0 2.5mm; padding-bottom: 1.2mm; }
    h3 { color: #334155; font-size: 10.8pt; margin: 4mm 0 2mm; }
    p { margin: 0 0 2.7mm; orphans: 3; widows: 3; }
    ul, ol { margin: 0 0 3mm 5mm; padding-left: 4mm; }
    li { margin: 0 0 1.1mm; }
    strong { color: #0f172a; }
    a { color: #4f46e5; text-decoration: none; }
    code { background: #f1f5f9; border-radius: 2px; color: #312e81; font-family: Consolas, "Courier New", monospace; font-size: 0.9em; padding: 0.1em 0.28em; }
    .code-block { break-inside: avoid; margin: 2.5mm 0 3mm; }
    .code-label { background: #312e81; border-radius: 4px 4px 0 0; color: white; display: inline-block; font-size: 6.5pt; font-weight: 700; letter-spacing: 0.5px; padding: 0.8mm 2mm; text-transform: uppercase; }
    pre { background: #0f172a; border-radius: 0 4px 4px 4px; color: #e2e8f0; font-family: Consolas, "Courier New", monospace; font-size: 6.8pt; line-height: 1.27; margin: 0; overflow-wrap: anywhere; padding: 2.5mm 3mm; white-space: pre-wrap; }
    pre code { background: transparent; color: inherit; font-size: inherit; padding: 0; }
    table { border-collapse: collapse; font-size: 7.7pt; margin: 2.5mm 0 4mm; width: 100%; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    th { background: #312e81; color: white; font-weight: 700; text-align: left; }
    th, td { border: 1px solid #cbd5e1; padding: 1.5mm 2mm; vertical-align: top; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    hr { border: 0; border-top: 1px solid #94a3b8; margin: 6mm 0; }
    .appendix-title { break-before: page; padding-top: 1mm; }
    body::after { color: #64748b; content: "Pritam Raha - Secure Multi-Tenant Activity Feed - ${escapeHtml(generatedAt)}"; display: block; font-size: 6.5pt; margin-top: 7mm; text-align: center; }
  </style>
</head>
<body>
${body}
</body>
</html>`;

await writeFile(outputPath, html, "utf8");
console.log(JSON.stringify({ inputPath, outputPath }));
