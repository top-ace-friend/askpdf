"use client";

import { FunctionComponent, useEffect, useState } from "react";
import { Resizable } from "re-resizable";

interface PdfViewerProps {
  pdfUrl: string;
}

const PdfViewer: FunctionComponent<PdfViewerProps> = ({
  pdfUrl,
}: PdfViewerProps) => {
  const [width, setWidth] = useState(0);
  const [maxWidth, setMaxWidth] = useState(window.innerWidth - 826);

  useEffect(() => {
    window.addEventListener("resize", () => {
      setMaxWidth(window.innerWidth - 826);
    });

    return () => {
      window.removeEventListener("resize", () => {});
    };
  }, []);

  return (
    <Resizable
      size={{ width: width || "60%", height: "100%" }}
      maxWidth={maxWidth}
      minWidth={500}
      enable={{
        top: false,
        right: true,
        bottom: false,
        left: false,
        topRight: false,
        bottomRight: false,
        bottomLeft: false,
        topLeft: false,
      }}
      onResizeStop={(e, direction, ref, d) => {
        setWidth(width + d.width);
      }}
      handleComponent={{
        right: (
          <div className="w-1.5 h-full bg-purple-custom-50 dark:bg-neutral-950 cursor-col-resize" />
        ),
      }}
    >
      <iframe width="100%" height="100%" src={pdfUrl} className="rounded-md" />
    </Resizable>
  );
};

export default PdfViewer;
