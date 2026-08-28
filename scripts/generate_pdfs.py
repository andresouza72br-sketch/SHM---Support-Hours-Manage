"""
Gerador de PDFs Editoriais de Alta Qualidade para o Projeto SHM 2.5
- Manifesto de Engenharia de Software (3 Páginas Perfeitas)
- Documentação Oficial do SHM (6 Páginas Perfeitas)

Autor: André Luis de Souza (Engenheiro de Requisitos - UniCEUB)
Mentoria: Prof. Sandeco Macedo (Framework Reversa SDD)
"""

import sys
import os
import re
import shutil
import time
from pathlib import Path

# Garante saída UTF-8 no Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

import markdown
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

BASE_DIR = Path(__file__).resolve().parent.parent

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
    
    <!-- Mermaid.js -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    
    <!-- KaTeX -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>

    <style>
        :root {{
            --font-heading: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            --font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
            
            --color-text-primary: #1e293b;   /* Slate 800 */
            --color-text-secondary: #334155; /* Slate 700 */
            --color-text-muted: #64748b;     /* Slate 500 */
            --color-text-heading: #0f172a;   /* Slate 900 */
            
            --color-bg-page: #ffffff;
            --color-bg-subtle: #f8fafc;     /* Slate 50 */
            --color-bg-alt: #f1f5f9;        /* Slate 100 */
            
            --color-border-light: #e2e8f0;  /* Slate 200 */
            --color-border-subtle: #cbd5e1; /* Slate 300 */
            --color-border-strong: #94a3b8; /* Slate 400 */
            
            --color-accent-blue: #0284c7;   /* Sky 600 */
            --color-accent-indigo: #4f46e5; /* Indigo 600 */
            --color-accent-amber: #d97706;  /* Amber 600 */
            --color-accent-emerald: #059669;/* Emerald 600 */
        }}

        @page {{
            size: A4;
            margin: 11mm 13mm 12mm 13mm;
            @top-left {{
                content: "{header_left}";
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-size: 7.5pt;
                font-weight: 700;
                color: #64748b;
                letter-spacing: 0.8px;
                text-transform: uppercase;
            }}
            @top-right {{
                content: "{header_right}";
                font-family: 'Inter', sans-serif;
                font-size: 7.5pt;
                font-weight: 500;
                color: #94a3b8;
            }}
            @bottom-left {{
                content: "Support Hours Manager 2.5 • Framework Reversa SDD";
                font-family: 'Inter', sans-serif;
                font-size: 7.5pt;
                color: #94a3b8;
            }}
            @bottom-right {{
                content: "Página " counter(page);
                font-family: 'Inter', sans-serif;
                font-size: 7.5pt;
                font-weight: 600;
                color: #475569;
            }}
        }}

        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}

        body {{
            font-family: var(--font-body);
            font-size: {font_size};
            line-height: {line_height};
            color: var(--color-text-primary);
            background-color: var(--color-bg-page);
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
            word-wrap: break-word;
        }}

        /* Document Header */
        .doc-header {{
            text-align: center;
            margin-bottom: 12px;
            padding: 10px 14px 12px 14px;
            background: var(--color-bg-subtle);
            border: 1px solid var(--color-border-light);
            border-radius: 8px;
            page-break-inside: avoid;
            break-inside: avoid;
        }}

        .doc-header h1 {{
            font-family: var(--font-heading);
            font-size: 16pt;
            font-weight: 800;
            line-height: 1.25;
            color: var(--color-text-heading);
            margin-top: 0;
            margin-bottom: 4px;
            letter-spacing: -0.4px;
            border-bottom: none;
            padding-bottom: 0;
            text-align: center;
        }}

        .doc-header h2, .doc-header h3, .doc-header p {{
            font-family: var(--font-body);
            font-size: 9.5pt;
            font-weight: 500;
            line-height: 1.38;
            color: var(--color-text-secondary);
            max-width: 95%;
            margin: 0 auto 6px auto;
            border-bottom: none;
            padding-bottom: 0;
            text-align: center;
        }}

        .doc-header p:last-child {{
            margin-bottom: 0;
        }}

        /* Badges Container */
        .doc-header p:has(img) {{
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            gap: 5px;
            margin: 6px auto 0 auto;
            text-align: center;
        }}

        .doc-header a {{
            display: inline-block;
            text-decoration: none;
            line-height: 1;
        }}

        .doc-header img {{
            height: 19px;
            vertical-align: middle;
            border-radius: 3px;
        }}

        /* Typography & Headings */
        h1, h2, h3, h4, h5, h6 {{
            font-family: var(--font-heading);
            color: var(--color-text-heading);
            font-weight: 700;
            page-break-after: avoid;
            break-after: avoid;
        }}

        h1 {{
            font-size: 13pt;
            margin-top: 14px;
            margin-bottom: 6px;
            padding-bottom: 3px;
            border-bottom: 1.5px solid var(--color-border-light);
            letter-spacing: -0.3px;
        }}

        h2 {{
            font-size: 11.5pt;
            margin-top: 12px;
            margin-bottom: 5px;
            padding-bottom: 2.5px;
            border-bottom: 1px solid var(--color-border-light);
            letter-spacing: -0.2px;
            color: #0f172a;
        }}

        h3 {{
            font-size: 10pt;
            margin-top: 10px;
            margin-bottom: 3px;
            color: #1e293b;
        }}

        h4 {{
            font-size: 9pt;
            margin-top: 8px;
            margin-bottom: 2.5px;
        }}

        p {{
            margin-bottom: 5px;
            text-align: justify;
        }}

        ul, ol {{
            margin-top: 2px;
            margin-bottom: 6px;
            padding-left: 18px;
        }}

        li {{
            margin-bottom: 2px;
        }}

        strong {{
            font-weight: 600;
            color: var(--color-text-heading);
        }}

        em {{
            font-style: italic;
        }}

        hr {{
            border: 0;
            height: 1px;
            background: var(--color-border-light);
            margin: 10px 0;
        }}

        /* Callout Boxes (GitHub-style Alerts) */
        .callout {{
            margin: 8px 0;
            padding: 8px 12px;
            border-radius: 6px;
            border-left: 3.5px solid var(--color-border-strong);
            background: var(--color-bg-subtle);
            page-break-inside: avoid;
            break-inside: avoid;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }}

        .callout-title {{
            font-family: var(--font-heading);
            font-size: 8.2pt;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 4px;
            margin-bottom: 3px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}

        .callout-important {{
            border-left-color: #2563eb;
            background: #f0f7ff;
        }}
        .callout-important .callout-title {{
            color: #1d4ed8;
        }}

        .callout-warning {{
            border-left-color: #d97706;
            background: #fffbeb;
        }}
        .callout-warning .callout-title {{
            color: #b45309;
        }}

        .callout-tip {{
            border-left-color: #059669;
            background: #f0fdf4;
        }}
        .callout-tip .callout-title {{
            color: #047857;
        }}

        .callout-note {{
            border-left-color: #475569;
            background: #f8fafc;
        }}
        .callout-note .callout-title {{
            color: #334155;
        }}

        .callout-content {{
            font-size: 8.5pt;
            line-height: 1.42;
            color: var(--color-text-primary);
        }}
        .callout-content p:last-child {{
            margin-bottom: 0;
        }}
        .callout-content h3 {{
            margin-top: 1px;
            margin-bottom: 3px;
            font-size: 9.5pt;
            color: #1d4ed8;
        }}

        /* Blockquote fallback */
        blockquote:not(.callout) {{
            border-left: 3.5px solid var(--color-accent-blue);
            background: #f8fafc;
            padding: 6px 10px;
            margin: 8px 0;
            border-radius: 0 4px 4px 0;
            font-style: italic;
            color: var(--color-text-secondary);
            page-break-inside: avoid;
            break-inside: avoid;
        }}

        /* Tables - Light Editorial */
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
            font-size: 8pt;
            page-break-inside: avoid;
            break-inside: avoid;
            border: 1px solid var(--color-border-light);
            border-radius: 4px;
            overflow: hidden;
        }}

        th {{
            background-color: #f1f5f9;
            color: #0f172a;
            font-family: var(--font-heading);
            font-weight: 700;
            text-align: left;
            padding: 5px 8px;
            border-bottom: 1.5px solid #cbd5e1;
            border-right: 1px solid #e2e8f0;
            font-size: 7.6pt;
            letter-spacing: 0.2px;
        }}
        th:last-child {{
            border-right: none;
        }}

        td {{
            padding: 4.5px 8px;
            border-bottom: 1px solid var(--color-border-light);
            border-right: 1px solid #e2e8f0;
            vertical-align: top;
            color: var(--color-text-primary);
        }}
        td:last-child {{
            border-right: none;
        }}

        tr:nth-child(even) td {{
            background-color: #f8fafc;
        }}

        tr:last-child td {{
            border-bottom: none;
        }}

        /* Code & Monospace */
        code {{
            font-family: var(--font-mono);
            font-size: 7.6pt;
            background: #f1f5f9;
            color: #0f172a;
            padding: 1px 3px;
            border-radius: 3px;
            border: 1px solid #e2e8f0;
        }}

        pre {{
            font-family: var(--font-mono);
            font-size: 7.2pt;
            line-height: 1.35;
            background: #f8fafc;
            color: #1e293b;
            padding: 7px 9px;
            border-radius: 5px;
            border: 1px solid var(--color-border-light);
            margin: 7px 0;
            overflow-x: auto;
            page-break-inside: avoid;
            break-inside: avoid;
        }}
        pre code {{
            background: transparent;
            border: none;
            padding: 0;
            color: inherit;
        }}

        /* Mermaid Flowcharts Container */
        .mermaid-card {{
            background: #ffffff;
            border: 1px solid var(--color-border-light);
            border-radius: 6px;
            padding: 6px 8px;
            margin: 8px 0;
            text-align: center;
            page-break-inside: avoid;
            break-inside: avoid;
        }}

        .mermaid-card svg {{
            max-width: 520px !important;
            max-height: 130px !important;
            width: auto !important;
            height: auto !important;
            display: block;
            margin: 0 auto;
            font-family: 'Plus Jakarta Sans', 'Inter', sans-serif !important;
        }}

        /* Math formula display */
        .math-block {{
            text-align: center;
            padding: 6px;
            margin: 6px 0;
            background: #f8fafc;
            border-radius: 5px;
            border: 1px solid var(--color-border-light);
            page-break-inside: avoid;
            break-inside: avoid;
            font-size: 9.5pt;
        }}

        /* Signature block */
        .signature-box {{
            margin-top: 12px;
            padding: 10px 14px;
            border-radius: 6px;
            background: #f8fafc;
            border: 1px solid var(--color-border-light);
            text-align: center;
            page-break-inside: avoid;
            break-inside: avoid;
        }}
        .signature-box h3 {{
            font-family: var(--font-heading);
            font-size: 10pt;
            font-weight: 700;
            color: #0f172a;
            margin-top: 4px;
            margin-bottom: 3px;
            text-align: center;
        }}
        .signature-box p {{
            text-align: center;
            margin-bottom: 2px;
        }}

        .text-center {{
            text-align: center;
        }}
    </style>
</head>
<body>
    <div class="content-container">
        {body_content}
    </div>

    <script>
        document.addEventListener("DOMContentLoaded", function() {{
            if (typeof mermaid !== 'undefined') {{
                mermaid.initialize({{
                    startOnLoad: false,
                    theme: 'base',
                    themeVariables: {{
                        fontFamily: 'Plus Jakarta Sans, Inter, sans-serif',
                        fontSize: '11px',
                        primaryColor: '#e0f2fe',
                        primaryTextColor: '#0369a1',
                        primaryBorderColor: '#38bdf8',
                        lineColor: '#64748b',
                        secondaryColor: '#f1f5f9',
                        tertiaryColor: '#f8fafc',
                        clusterBkg: '#f8fafc',
                        clusterBorder: '#cbd5e1',
                        edgeLabelBackground: '#ffffff',
                        nodeTextColor: '#0f172a',
                        mainBkg: '#ffffff',
                        nodeBorder: '#94a3b8'
                    }},
                    flowchart: {{
                        curve: 'basis',
                        htmlLabels: true,
                        useMaxWidth: true,
                        padding: 6
                    }}
                }});
            }}

            if (typeof renderMathInElement !== 'undefined') {{
                renderMathInElement(document.body, {{
                    delimiters: [
                        {{left: "$$", right: "$$", display: true}},
                        {{left: "$", right: "$", display: false}}
                    ]
                }});
            }}
        }});
    </script>
</body>
</html>
"""


def clean_markdown_to_html(md_text: str, is_manifesto: bool = False) -> str:
    """Converte markdown em HTML limpo, evitando vazamento de tags e gerando estrutura editorial."""
    # 1. Remove YAML frontmatter se houver
    if md_text.startswith("---"):
        parts = md_text.split("---", 2)
        if len(parts) >= 3:
            md_text = parts[2]

    # 2. Extrai Mermaid blocks usando placeholders seguros
    mermaid_blocks = {}
    def save_mermaid(match):
        idx = len(mermaid_blocks)
        placeholder = f"MERMAIDPLACEHOLDER{idx}BLOCK"
        mermaid_blocks[placeholder] = match.group(1).strip()
        return f"\n\n{placeholder}\n\n"

    md_text = re.sub(r'```mermaid\s*\n(.*?)\n```', save_mermaid, md_text, flags=re.DOTALL)

    # 3. Trata o bloco inicial <div align="center"> ... </div>
    div_center_match = re.search(r'<div align="center">(.*?)</div>', md_text, flags=re.DOTALL | re.IGNORECASE)
    header_html = ""
    if div_center_match:
        header_content = div_center_match.group(1).strip()
        md_text = md_text.replace(div_center_match.group(0), "")
        
        # Remove a barra de links de navegacao no README ([Manifesto...] • [Autoria...])
        header_lines = []
        for line in header_content.split('\n'):
            if "•" in line and "[" in line and "]" in line:
                continue
            header_lines.append(line)
        cleaned_header_content = "\n".join(header_lines).strip()
        
        header_md_converted = markdown.markdown(cleaned_header_content, extensions=['extra', 'tables'])
        header_html = f'<div class="doc-header">{header_md_converted}</div>'

    # 4. Trata bloco de assinatura no final se houver
    sig_match = re.search(r'<div align="center">(.*?)</div>\s*$', md_text, flags=re.DOTALL | re.IGNORECASE)
    footer_html = ""
    if sig_match:
        footer_content = sig_match.group(1).strip()
        md_text = md_text.replace(sig_match.group(0), "")
        footer_md_converted = markdown.markdown(footer_content, extensions=['extra', 'tables'])
        footer_html = f'<div class="signature-box">{footer_md_converted}</div>'

    # 5. Remove qualquer tag <div> residual do texto Markdown
    md_text = re.sub(r'<div[^>]*>', '', md_text, flags=re.IGNORECASE)
    md_text = re.sub(r'</div>', '', md_text, flags=re.IGNORECASE)

    # 6. Converte Markdown base usando extensões
    body_html = markdown.markdown(md_text, extensions=['extra', 'tables', 'sane_lists', 'smarty'])

    # 7. Transforma blockquotes em Callouts elegantes
    for a_type in ["IMPORTANT", "WARNING", "TIP", "NOTE", "CAUTION"]:
        icon = "📜" if a_type == "IMPORTANT" else ("⚠️" if a_type == "WARNING" else ("💡" if a_type == "TIP" else "ℹ️"))
        label = "Destaque Importante" if a_type == "IMPORTANT" else ("Atenção Crítica" if a_type == "WARNING" else ("Nota Técnica" if a_type == "TIP" else "Nota"))
        
        # Pattern matches <blockquote> containing [!TYPE]
        pattern = re.compile(
            rf'<blockquote>\s*<p>\s*\[!{a_type}\]\s*(?:</p>)?\s*(.*?)\s*</blockquote>',
            re.DOTALL | re.IGNORECASE
        )
        def repl(m, cls=a_type.lower(), ic=icon, lb=label):
            inner = m.group(1).strip()
            if not inner.startswith("<p") and not inner.startswith("<h"):
                inner = f"<p>{inner}</p>"
            return f'<div class="callout callout-{cls}"><div class="callout-title">{ic} {lb}</div><div class="callout-content">{inner}</div></div>'
        body_html = pattern.sub(repl, body_html)

    # 8. Restaura Mermaid Blocks
    for placeholder, code in mermaid_blocks.items():
        cleaned_code = code.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
        mermaid_html = f'<div class="mermaid-card"><div class="mermaid">\n{cleaned_code}\n</div></div>'
        body_html = re.sub(rf'<p>\s*{placeholder}\s*</p>', mermaid_html, body_html)
        body_html = body_html.replace(placeholder, mermaid_html)

    # 9. Trata fórmulas MathJax $$...$$
    math_pattern = re.compile(r'<p>\s*(\$\$.*?\$\$)\s*</p>', re.DOTALL)
    body_html = math_pattern.sub(r'<div class="math-block">\1</div>', body_html)

    # 10. Monta o HTML final
    final_html = f"{header_html}\n{body_html}\n{footer_html}"

    # 11. Limpezas finais
    final_html = final_html.replace("<p></p>", "")
    final_html = final_html.replace("&lt;div", "<div")
    final_html = final_html.replace("&lt;/div&gt;", "</div>")
    final_html = final_html.replace("&lt;small&gt;", "<small>")
    final_html = final_html.replace("&lt;/small&gt;", "</small>")

    return final_html


def generate_single_pdf(
    md_file: Path,
    output_pdf: Path,
    title: str,
    header_left: str,
    header_right: str,
    font_size: str = "8.8pt",
    line_height: str = "1.44",
    is_manifesto: bool = False
):
    """Gera o PDF a partir de um arquivo markdown com alta fidelidade editorial."""
    with open(md_file, "r", encoding="utf-8") as f:
        md_content = f.read()

    html_content = clean_markdown_to_html(md_content, is_manifesto=is_manifesto)
    
    full_page_html = HTML_TEMPLATE.format(
        title=title,
        header_left=header_left,
        header_right=header_right,
        font_size=font_size,
        line_height=line_height,
        body_content=html_content
    )

    temp_html_path = output_pdf.parent / f"_temp_{output_pdf.stem}.html"
    with open(temp_html_path, "w", encoding="utf-8") as f:
        f.write(full_page_html)

    print(f"-> Renderizando {output_pdf.name} com Playwright (Edge)...")
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(
            viewport={"width": 1200, "height": 1600},
            device_scale_factor=2
        )
        page = context.new_page()
        page.goto(temp_html_path.as_uri(), wait_until="networkidle")
        
        # Executa Mermaid e ajusta dimensões das SVGs
        page.evaluate('''async () => {
            if (typeof mermaid !== 'undefined') {
                try {
                    await mermaid.run();
                } catch (e) {
                    console.error("Mermaid execution error:", e);
                }
            }
            document.querySelectorAll('.mermaid-card svg').forEach(svg => {
                const vb = svg.viewBox.baseVal;
                if (vb && vb.width > 0) {
                    svg.style.maxWidth = Math.min(vb.width * 0.9, 520) + 'px';
                    svg.style.maxHeight = '130px';
                    svg.style.width = '100%';
                    svg.style.height = 'auto';
                }
            });
        }''')
        page.wait_for_timeout(2500)

        output_pdf.parent.mkdir(parents=True, exist_ok=True)
        page.pdf(
            path=str(output_pdf),
            format="A4",
            print_background=True,
            margin={
                "top": "11mm",
                "right": "13mm",
                "bottom": "12mm",
                "left": "13mm"
            },
            prefer_css_page_size=True
        )
        browser.close()

    if temp_html_path.exists():
        temp_html_path.unlink()

    print(f"[OK] PDF gerado: {output_pdf}")


def validate_pdf_content(pdf_path: Path):
    """Valida ausência de tags vazadas no texto extraído do PDF."""
    reader = PdfReader(str(pdf_path))
    num_pages = len(reader.pages)
    print(f"\nVerificando {pdf_path.name} ({num_pages} paginas)...")
    
    leaked = []
    forbidden = ['<div', '</div>', '<small', '</small>', '<center', '</center>', 'align="center"', ':::', 'MERMAIDPLACEHOLDER', '[!IMPORTANT]', '[!WARNING]', '[!TIP]']
    
    for idx, page in enumerate(reader.pages):
        txt = page.extract_text()
        for fb in forbidden:
            if fb in txt:
                leaked.append((idx + 1, fb))
                
    if leaked:
        print(f"[ERRO] Tags vazadas encontradas em {pdf_path.name}: {leaked}")
        return False
    print(f"[SUCESSO] Nenhuma tag HTML vazada em {pdf_path.name}! Total de paginas: {num_pages}")
    return True


def main():
    print("Iniciando geracao dos PDFs de Alta Qualidade Editorial do SHM 2.5...\n")
    
    manifesto_md = BASE_DIR / "Manifesto" / "manifesto.md"
    readme_md = BASE_DIR / "README.md"
    
    # 1. Manifesto (3 páginas perfeitas)
    manifesto_pdf_main = BASE_DIR / "Manifesto" / "Manifesto-SHM-Engenharia-vs-Vibe-Coding.pdf"
    manifesto_pdf_copy = BASE_DIR / "Manifesto" / "manifesto.pdf"
    
    generate_single_pdf(
        md_file=manifesto_md,
        output_pdf=manifesto_pdf_main,
        title="Manifesto de Engenharia de Software - Support Hours Manager",
        header_left="SHM 2.5 • MANIFESTO DE ENGENHARIA",
        header_right="ANDRÉ LUIS DE SOUZA",
        font_size="8.85pt",
        line_height="1.44",
        is_manifesto=True
    )
    shutil.copyfile(manifesto_pdf_main, manifesto_pdf_copy)
    print(f"[COPIA] Criada copia: {manifesto_pdf_copy}")

    # 2. README / Documentacao Oficial (6 páginas perfeitas)
    doc_pdf_main = BASE_DIR / "docs" / "SHM-Documentacao-Oficial.pdf"
    doc_pdf_readme = BASE_DIR / "README.pdf"
    doc_pdf_docs_readme = BASE_DIR / "docs" / "README.pdf"
    
    generate_single_pdf(
        md_file=readme_md,
        output_pdf=doc_pdf_main,
        title="Documentação Oficial - Support Hours Manager 2.5",
        header_left="SHM 2.5 • DOCUMENTAÇÃO OFICIAL",
        header_right="ESPECIFICAÇÕES SDD",
        font_size="8.65pt",
        line_height="1.42",
        is_manifesto=False
    )
    shutil.copyfile(doc_pdf_main, doc_pdf_readme)
    print(f"[COPIA] Criada copia: {doc_pdf_readme}")
    if doc_pdf_docs_readme.parent.exists():
        shutil.copyfile(doc_pdf_main, doc_pdf_docs_readme)
        print(f"[COPIA] Criada copia: {doc_pdf_docs_readme}")

    # 3. Validacao rigorosa
    print("\n" + "="*50)
    v1 = validate_pdf_content(manifesto_pdf_main)
    v2 = validate_pdf_content(doc_pdf_main)
    
    if v1 and v2:
        print("\n[CONCLUIDO] Todos os PDFs foram gerados e validados com 100% de precisao!")
    else:
        print("\n[AVISO] Verifique as mensagens de erro acima.")


if __name__ == "__main__":
    main()
