import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  subscribePDFProgress,
  getPDFProgress,
  type PDFProgressInfo,
} from "@/utils/pdfProgress";

const PDFProgressDialog = () => {
  const [info, setInfo] = useState<PDFProgressInfo | null>(getPDFProgress);

  useEffect(() => {
    const unsubscribe = subscribePDFProgress(setInfo);
    return unsubscribe;
  }, []);

  const percent =
    info && info.total > 0
      ? Math.min(100, Math.round((info.current / info.total) * 100))
      : 0;

  return (
    <Dialog open={info !== null} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating PDF
          </DialogTitle>
          <DialogDescription>
            Please wait while your document is being generated. Large documents
            can take up to a minute.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Progress value={percent} />
          <p className="text-xs text-muted-foreground">
            {info?.stage || "Preparing document…"}
            {info && info.total > 0
              ? ` (${Math.min(info.current, info.total)} of ${info.total})`
              : ""}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFProgressDialog;
