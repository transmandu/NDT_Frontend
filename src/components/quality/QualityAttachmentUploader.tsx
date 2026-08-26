"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Paperclip } from "lucide-react";
import toast from "react-hot-toast";
import qualityApi from "@/lib/qualityApi";
import { getApiError } from "@/lib/apiErrors";
import { C } from "@/lib/colors";

export default function QualityAttachmentUploader({
  kind,
  id,
}: {
  kind: "nc" | "ac";
  id: number;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const queryKey = kind === "nc" ? ["quality", "nc", id] : ["quality", "ac", id];

  const uploadMut = useMutation({
    mutationFn: (file: File) =>
      kind === "nc"
        ? qualityApi.uploadNcAttachment(id, file)
        : qualityApi.uploadAcAttachment(id, file),
    onSuccess: () => {
      toast.success("Adjunto subido correctamente");
      qc.invalidateQueries({ queryKey });
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadMut.mutate(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={uploadMut.isPending}
        onClick={() => inputRef.current?.click()}
        className="h-7 px-3 rounded text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
        style={{ border: `1px dashed ${C.primary}`, color: C.primary }}
      >
        {uploadMut.isPending ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Paperclip size={15} />
        )}
        Adjuntar evidencia
      </button>
    </div>
  );
}
