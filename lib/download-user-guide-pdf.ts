/**
 * Renders a DOM node to a multi-page A4 PDF using html2canvas + jsPDF (client-only).
 */
export async function downloadElementAsPdf(root: HTMLElement, filename: string): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const needsSafeColors = root.dataset.pdfSafeColors === "1" || root.dataset.pdfSafeColors === "true";
  const canvas = await html2canvas(root, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: root.scrollWidth,
    windowHeight: root.scrollHeight,
    onclone: needsSafeColors
      ? (doc) => {
          const style = doc.createElement("style");
          style.setAttribute("data-pdf-safe-colors", "1");
          style.textContent = `
            /* Force color tokens to PDF-safe rgb/hex values. */
            [data-pdf-safe-colors="1"] { background: #ffffff !important; color: #0f172a !important; }
            [data-pdf-safe-colors="1"], [data-pdf-safe-colors="1"] * {
              color: #0f172a !important;
              border-color: #cbd5e1 !important;
              background-color: #ffffff !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }
            [data-pdf-safe-colors="1"] a { color: #0f172a !important; text-decoration: none !important; }
            [data-pdf-safe-colors="1"] thead { background-color: #f8fafc !important; }
          `;
          doc.head.appendChild(style);
        }
      : undefined,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  /** Multi-page: shift image up on each page so A4 slices stack (standard jsPDF + html2canvas pattern). */
  let offsetY = 0;
  while (offsetY < imgHeight) {
    if (offsetY > 0) {
      pdf.addPage();
    }
    pdf.addImage(imgData, "PNG", 0, -offsetY, imgWidth, imgHeight);
    offsetY += pdfHeight;
  }

  pdf.save(filename);
}
